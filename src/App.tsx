import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Home } from "./pages/Home";
import { GameRoom } from "./pages/GameRoom";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
