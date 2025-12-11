import title from "@/assets/title.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/hooks/useAppStore";
import { login } from "@/lib/login";
import { MenuIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // Import routing components

export function Header() {
  const loggedIn = useAppStore((store) => !!store.token);
  const logout = useAppStore((store) => store.logout);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="flex flex-col gap-3 items-center justify-center py-4 relative w-full">
      <Link to="/">
        <img src={title} className="h-16" alt="Satoshi's Auction House" />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="absolute top-4 right-4">
            <MenuIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          {location.pathname !== "/" && (
            <DropdownMenuItem asChild>
              <Link to="/">Home</Link>
            </DropdownMenuItem>
          )}
          {!loggedIn && (
            <DropdownMenuItem onClick={login}>Login</DropdownMenuItem>
          )}

          {loggedIn && (
            <>
              <DropdownMenuItem asChild>
                <Link to="/listings/new">Create Listing</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/rolznz/satoshis-auction-house"
                  target="_blank"
                >
                  About
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Log out
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
