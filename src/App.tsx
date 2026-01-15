import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Home } from "./pages/Home";
import { GameRoom } from "./pages/GameRoom";
import { AuthProvider } from "./contexts/AuthContext";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function Layout() {
  return <Outlet />;
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
    <ConvexAuthProvider client={convex}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConvexAuthProvider>
  );
}

export default App;
