import { useNavigate } from "react-router-dom";
import { GameWorld } from "../components/GameWorld";

// The public demo. Same world the real thing uses, but nothing persists and
// the doors explain rather than open — a parent can walk the town and see
// what it is before signing up.
export function PixelWorldPage() {
  const navigate = useNavigate();
  return <GameWorld
    // Everything a visitor taps in the demo leads to the same place: the
    // world is real, the contents are what an account buys.
    onEnterRoom={() => navigate("/register")}
    onEnterStall={() => navigate("/register")}
    onReadBoard={() => navigate("/register")}
    onTakeStage={() => navigate("/register")}
    onExit={() => navigate("/")}
  />;
}
