import GamePageClient from "./GamePageClient";

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { id } = await params;
  return <GamePageClient gameId={id} />;
}
