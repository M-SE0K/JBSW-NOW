import React from "react";
import Home from "../src/components/page/home";
import { PageTransition } from "../src/components/PageTransition";
import { usePageTransition } from "../src/hooks/usePageTransition";

export default function HomeScreen() {
  const { isVisible, isLoading, direction } = usePageTransition();
  
  return (
    <PageTransition isVisible={isVisible} showLoading={isLoading} direction={direction}>
      <Home />
    </PageTransition>
  );
}


