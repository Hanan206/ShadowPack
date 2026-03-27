module shadowpack::game {
    use std::vector;
    use one::coin::{Self, Coin};
    use one::oct::OCT;
    use one::balance::{Self, Balance};
    use one::clock::Clock;
    use one::event;
    use one::object::{Self, UID, ID};
    use one::transfer;
    use one::tx_context::{Self, TxContext};

    // ===== Errors =====
    const ENotHost: u64 = 0;
    const EGameFull: u64 = 1;
    const EInvalidPhase: u64 = 2;
    const EInsufficientStake: u64 = 3;
    const EAlreadyVoted: u64 = 4;
    const EPlayerNotAlive: u64 = 5;
    const EInvalidRound: u64 = 6;
    const ENotEnoughPlayers: u64 = 7;
    const EGameNotOver: u64 = 8;
    const EInvalidPlayerCount: u64 = 9;

    // ===== Phase Constants =====
    const PHASE_LOBBY: u8 = 0;
    const PHASE_NIGHT: u8 = 1;
    const PHASE_DAY_DISCUSSION: u8 = 2;
    const PHASE_DAY_VOTING: u8 = 3;
    const PHASE_GAME_OVER: u8 = 4;

    // ===== Role Constants =====
    const ROLE_VILLAGER: u8 = 0;
    const ROLE_WEREWOLF: u8 = 1;
    const ROLE_SEER: u8 = 2;
    const ROLE_DOCTOR: u8 = 3;

    // ===== Structs =====

    struct GameRoom has key {
        id: UID,
        host: address,
        phase: u8,
        round: u8,
        max_players: u8,
        alive_count: u8,
        werewolf_count: u8,
        betting_pool: Balance<OCT>,
        stake_amount: u64,
        created_at: u64,
        players: vector<address>,
        player_roles: vector<u8>,
        player_alive: vector<bool>,
        player_aliases: vector<vector<u8>>,
        player_is_ai: vector<bool>,
        votes: vector<address>,
        vote_counts: vector<u8>,
        has_voted: vector<bool>,
        winner_side: u8,
        night_target: address,
    }

    struct Bet has key, store {
        id: UID,
        game_id: ID,
        bettor: address,
        target: address,
        amount: Balance<OCT>,
    }

    // ===== Events =====

    struct GameCreated has copy, drop {
        game_id: ID,
        host: address,
        stake_amount: u64,
        max_players: u8,
    }

    struct PlayerJoined has copy, drop {
        game_id: ID,
        player: address,
        alias: vector<u8>,
        is_ai: bool,
    }

    struct GameStarted has copy, drop {
        game_id: ID,
        player_count: u8,
    }

    struct VoteCast has copy, drop {
        game_id: ID,
        voter: address,
        target: address,
        round: u8,
    }

    struct PlayerEliminated has copy, drop {
        game_id: ID,
        player: address,
        role_revealed: u8,
        round: u8,
    }

    struct BetPlaced has copy, drop {
        game_id: ID,
        bettor: address,
        target: address,
        amount: u64,
    }

    struct GameEnded has copy, drop {
        game_id: ID,
        winner_side: u8,
        rounds_played: u8,
    }

    struct PhaseAdvanced has copy, drop {
        game_id: ID,
        new_phase: u8,
        round: u8,
    }

    struct NightAction has copy, drop {
        game_id: ID,
        target: address,
        round: u8,
    }

    // ===== Entry Functions =====

    public entry fun create_game(
        stake_amount: u64,
        max_players: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(max_players >= 6 && max_players <= 10, EInvalidPlayerCount);

        let game = GameRoom {
            id: object::new(ctx),
            host: tx_context::sender(ctx),
            phase: PHASE_LOBBY,
            round: 0,
            max_players,
            alive_count: 0,
            werewolf_count: 0,
            betting_pool: balance::zero(),
            stake_amount,
            created_at: one::clock::timestamp_ms(clock),
            players: vector::empty(),
            player_roles: vector::empty(),
            player_alive: vector::empty(),
            player_aliases: vector::empty(),
            player_is_ai: vector::empty(),
            votes: vector::empty(),
            vote_counts: vector::empty(),
            has_voted: vector::empty(),
            winner_side: 0,
            night_target: @0x0,
        };

        let game_id = object::id(&game);

        event::emit(GameCreated {
            game_id,
            host: tx_context::sender(ctx),
            stake_amount,
            max_players,
        });

        transfer::share_object(game);
    }

    public entry fun join_game(
        game: &mut GameRoom,
        stake: Coin<OCT>,
        alias: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(game.phase == PHASE_LOBBY, EInvalidPhase);
        assert!((vector::length(&game.players) as u8) < game.max_players, EGameFull);
        assert!(coin::value(&stake) >= game.stake_amount, EInsufficientStake);

        let stake_balance = coin::into_balance(stake);
        balance::join(&mut game.betting_pool, stake_balance);

        let player = tx_context::sender(ctx);
        vector::push_back(&mut game.players, player);
        vector::push_back(&mut game.player_roles, 0);
        vector::push_back(&mut game.player_alive, true);
        vector::push_back(&mut game.player_aliases, alias);
        vector::push_back(&mut game.player_is_ai, false);
        vector::push_back(&mut game.votes, @0x0);
        vector::push_back(&mut game.vote_counts, 0);
        vector::push_back(&mut game.has_voted, false);

        event::emit(PlayerJoined {
            game_id: object::id(game),
            player,
            alias,
            is_ai: false,
        });
    }

    public entry fun add_ai_player(
        game: &mut GameRoom,
        alias: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == game.host, ENotHost);
        assert!(game.phase == PHASE_LOBBY, EInvalidPhase);
        assert!((vector::length(&game.players) as u8) < game.max_players, EGameFull);

        let ai_addr = tx_context::sender(ctx);
        vector::push_back(&mut game.players, ai_addr);
        vector::push_back(&mut game.player_roles, 0);
        vector::push_back(&mut game.player_alive, true);
        vector::push_back(&mut game.player_aliases, alias);
        vector::push_back(&mut game.player_is_ai, true);
        vector::push_back(&mut game.votes, @0x0);
        vector::push_back(&mut game.vote_counts, 0);
        vector::push_back(&mut game.has_voted, false);

        event::emit(PlayerJoined {
            game_id: object::id(game),
            player: ai_addr,
            alias,
            is_ai: true,
        });
    }

    public entry fun start_game(
        game: &mut GameRoom,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == game.host, ENotHost);
        assert!(game.phase == PHASE_LOBBY, EInvalidPhase);
        let player_count = vector::length(&game.players);
        assert!(player_count >= 6, ENotEnoughPlayers);

        let ww_count: u8 = if (player_count >= 9) { 3 } else if (player_count >= 7) { 2 } else { 1 };

        let random = pseudo_random(ctx);

        let roles_assigned: u8 = 0;
        let seer_assigned = false;
        let doctor_assigned = false;

        let i: u64 = 0;
        while (i < player_count) {
            let player_random = random ^ ((i + 1) * 7919);

            let role = if (roles_assigned < ww_count) {
                let remaining = player_count - i;
                let ww_remaining = ((ww_count - roles_assigned) as u64);
                if (player_random % remaining < ww_remaining) {
                    roles_assigned = roles_assigned + 1;
                    ROLE_WEREWOLF
                } else if (!seer_assigned && player_random % 3 == 0) {
                    seer_assigned = true;
                    ROLE_SEER
                } else if (!doctor_assigned && player_random % 5 == 0) {
                    doctor_assigned = true;
                    ROLE_DOCTOR
                } else {
                    ROLE_VILLAGER
                }
            } else if (!seer_assigned && player_random % 3 == 0) {
                seer_assigned = true;
                ROLE_SEER
            } else if (!doctor_assigned && player_random % 5 == 0) {
                doctor_assigned = true;
                ROLE_DOCTOR
            } else {
                ROLE_VILLAGER
            };

            *vector::borrow_mut(&mut game.player_roles, i) = role;
            i = i + 1;
        };

        if (!seer_assigned) {
            let j: u64 = 0;
            while (j < player_count) {
                if (*vector::borrow(&game.player_roles, j) == ROLE_VILLAGER) {
                    *vector::borrow_mut(&mut game.player_roles, j) = ROLE_SEER;
                    break
                };
                j = j + 1;
            };
        };

        if (!doctor_assigned) {
            let j: u64 = 0;
            while (j < player_count) {
                if (*vector::borrow(&game.player_roles, j) == ROLE_VILLAGER) {
                    *vector::borrow_mut(&mut game.player_roles, j) = ROLE_DOCTOR;
                    break
                };
                j = j + 1;
            };
        };

        game.phase = PHASE_NIGHT;
        game.round = 1;
        game.alive_count = (player_count as u8);
        game.werewolf_count = ww_count;

        event::emit(GameStarted {
            game_id: object::id(game),
            player_count: (player_count as u8),
        });
    }

    public entry fun place_bet(
        game: &mut GameRoom,
        target: address,
        bet: Coin<OCT>,
        ctx: &mut TxContext
    ) {
        assert!(game.phase != PHASE_LOBBY && game.phase != PHASE_GAME_OVER, EInvalidPhase);

        let bet_amount = coin::value(&bet);
        let bet_balance = coin::into_balance(bet);

        let bet_obj = Bet {
            id: object::new(ctx),
            game_id: object::id(game),
            bettor: tx_context::sender(ctx),
            target,
            amount: bet_balance,
        };

        event::emit(BetPlaced {
            game_id: object::id(game),
            bettor: tx_context::sender(ctx),
            target,
            amount: bet_amount,
        });

        transfer::transfer(bet_obj, tx_context::sender(ctx));
    }

    public entry fun cast_vote(
        game: &mut GameRoom,
        target: address,
        round: u8,
        _clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(game.phase == PHASE_DAY_VOTING, EInvalidPhase);
        assert!(round == game.round, EInvalidRound);

        let voter = tx_context::sender(ctx);

        let voter_idx = find_player_index(&game.players, voter);
        assert!(*vector::borrow(&game.player_alive, voter_idx), EPlayerNotAlive);
        assert!(!*vector::borrow(&game.has_voted, voter_idx), EAlreadyVoted);

        let target_idx = find_player_index(&game.players, target);
        assert!(*vector::borrow(&game.player_alive, target_idx), EPlayerNotAlive);

        *vector::borrow_mut(&mut game.votes, voter_idx) = target;
        *vector::borrow_mut(&mut game.has_voted, voter_idx) = true;
        let current_count = *vector::borrow(&game.vote_counts, target_idx);
        *vector::borrow_mut(&mut game.vote_counts, target_idx) = current_count + 1;

        event::emit(VoteCast {
            game_id: object::id(game),
            voter,
            target,
            round,
        });
    }

    public entry fun night_action(
        game: &mut GameRoom,
        target: address,
        ctx: &mut TxContext
    ) {
        assert!(game.phase == PHASE_NIGHT, EInvalidPhase);
        assert!(tx_context::sender(ctx) == game.host, ENotHost);

        let target_idx = find_player_index(&game.players, target);
        assert!(*vector::borrow(&game.player_alive, target_idx), EPlayerNotAlive);

        game.night_target = target;

        event::emit(NightAction {
            game_id: object::id(game),
            target,
            round: game.round,
        });
    }

    public entry fun eliminate_player(
        game: &mut GameRoom,
        target: address,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == game.host, ENotHost);
        assert!(game.phase != PHASE_LOBBY && game.phase != PHASE_GAME_OVER, EInvalidPhase);

        let target_idx = find_player_index(&game.players, target);
        assert!(*vector::borrow(&game.player_alive, target_idx), EPlayerNotAlive);

        *vector::borrow_mut(&mut game.player_alive, target_idx) = false;
        game.alive_count = game.alive_count - 1;

        let role = *vector::borrow(&game.player_roles, target_idx);
        if (role == ROLE_WEREWOLF) {
            game.werewolf_count = game.werewolf_count - 1;
        };

        event::emit(PlayerEliminated {
            game_id: object::id(game),
            player: target,
            role_revealed: role,
            round: game.round,
        });

        if (game.werewolf_count == 0) {
            game.phase = PHASE_GAME_OVER;
            game.winner_side = 0;
            event::emit(GameEnded {
                game_id: object::id(game),
                winner_side: 0,
                rounds_played: game.round,
            });
        } else if (game.werewolf_count >= game.alive_count - game.werewolf_count) {
            game.phase = PHASE_GAME_OVER;
            game.winner_side = 1;
            event::emit(GameEnded {
                game_id: object::id(game),
                winner_side: 1,
                rounds_played: game.round,
            });
        };
    }

    public entry fun advance_phase(
        game: &mut GameRoom,
        _clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == game.host, ENotHost);
        assert!(game.phase != PHASE_GAME_OVER, EInvalidPhase);

        if (game.phase == PHASE_NIGHT) {
            game.phase = PHASE_DAY_DISCUSSION;
        } else if (game.phase == PHASE_DAY_DISCUSSION) {
            game.phase = PHASE_DAY_VOTING;
        } else if (game.phase == PHASE_DAY_VOTING) {
            let count = vector::length(&game.players);
            let i: u64 = 0;
            while (i < count) {
                *vector::borrow_mut(&mut game.votes, i) = @0x0;
                *vector::borrow_mut(&mut game.vote_counts, i) = 0;
                *vector::borrow_mut(&mut game.has_voted, i) = false;
                i = i + 1;
            };
            game.phase = PHASE_NIGHT;
            game.round = game.round + 1;
            game.night_target = @0x0;
        };

        event::emit(PhaseAdvanced {
            game_id: object::id(game),
            new_phase: game.phase,
            round: game.round,
        });
    }

    public entry fun settle_bets(
        game: &mut GameRoom,
        bet: Bet,
        ctx: &mut TxContext
    ) {
        assert!(game.phase == PHASE_GAME_OVER, EGameNotOver);

        let Bet { id, game_id: _, bettor, target, amount } = bet;

        let target_idx = find_player_index(&game.players, target);
        let target_role = *vector::borrow(&game.player_roles, target_idx);

        if (target_role == ROLE_WEREWOLF) {
            let bet_value = balance::value(&amount);
            let bonus_amount = if (balance::value(&game.betting_pool) >= bet_value) {
                bet_value
            } else {
                balance::value(&game.betting_pool)
            };

            let payout = coin::from_balance(amount, ctx);
            transfer::public_transfer(payout, bettor);

            if (bonus_amount > 0) {
                let bonus_balance = balance::split(&mut game.betting_pool, bonus_amount);
                let bonus_coin = coin::from_balance(bonus_balance, ctx);
                transfer::public_transfer(bonus_coin, bettor);
            };
        } else {
            balance::join(&mut game.betting_pool, amount);
        };

        object::delete(id);
    }

    // ===== Helper Functions =====

    fun pseudo_random(ctx: &mut TxContext): u64 {
        let uid = object::new(ctx);
        let random_bytes = object::uid_to_bytes(&uid);
        object::delete(uid);

        let result: u64 = 0;
        let i = 0;
        while (i < 8 && i < vector::length(&random_bytes)) {
            result = (result << 8) | (*vector::borrow(&random_bytes, i) as u64);
            i = i + 1;
        };
        result
    }

    fun find_player_index(players: &vector<address>, player: address): u64 {
        let i: u64 = 0;
        let len = vector::length(players);
        while (i < len) {
            if (*vector::borrow(players, i) == player) {
                return i
            };
            i = i + 1;
        };
        abort 999
    }

    // ===== View Functions =====

    public fun get_phase(game: &GameRoom): u8 { game.phase }
    public fun get_round(game: &GameRoom): u8 { game.round }
    public fun get_alive_count(game: &GameRoom): u8 { game.alive_count }
    public fun get_werewolf_count(game: &GameRoom): u8 { game.werewolf_count }
    public fun get_player_count(game: &GameRoom): u64 { vector::length(&game.players) }
}
