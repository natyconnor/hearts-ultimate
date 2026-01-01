import {
  createBrowserRouter,
  RouterProvider,
  Link,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Home } from "./pages/Home";
import { GameRoom } from "./pages/GameRoom";
import { useGameStore } from "./store/gameStore";

const queryClient = new QueryClient();

function Navbar() {
  const currentRoom = useGameStore((state) => state.currentRoom);

  return (
    <nav
      style={{
        padding: "1rem",
        borderBottom: "1px solid #ccc",
        marginBottom: "1rem",
      }}
    >
      <Link to="/" style={{ marginRight: "1rem" }}>
        Home
      </Link>
      {currentRoom.slug && <span>Current Room: {currentRoom.slug}</span>}
    </nav>
  );
}

function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "room/:slug",
        element: <GameRoom />,
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
