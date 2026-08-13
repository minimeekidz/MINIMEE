import { useNavigate } from "react-router-dom";
import { GameWorld } from "../components/GameWorld";

// The public demo. Same world the real thing uses, but nothing persists and
// the doors explain rather than open — a parent can walk the town and see
// what it is before signing up.
export function PixelWorldPage() {
  const navigate = useNavigate();
  return <GameWorld
    onEnterRoom={() => navigate("/register")}
    onExit={() => navigate("/")}
  />;
}
