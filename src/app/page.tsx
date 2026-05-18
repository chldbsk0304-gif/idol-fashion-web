import FitMatchApp from "@/components/fitmatch/FitMatchApp";

// FitMatchApp is a client component ('use client'); Next will render it on
// the client without us touching SSR flags.
export default function Page() {
  return <FitMatchApp />;
}
