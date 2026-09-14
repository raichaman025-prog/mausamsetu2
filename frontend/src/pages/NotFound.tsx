import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
      <p className="mt-2 text-sm text-slate-500">This page doesn't exist in the MausamSetu prototype.</p>
      <Link to="/" className="mt-6"><Button>Back to Home</Button></Link>
    </div>
  );
}
