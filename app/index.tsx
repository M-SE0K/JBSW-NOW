import React, { memo } from "react";
import Home from "../src/components/page/home";
import { PageTransition } from "../src/components/PageTransition";
import { usePageTransition } from "../src/hooks/usePageTransition";

const HomeScreen = memo(() => {
  const { isVisible, direction } = usePageTransition();
  
  return (
    <PageTransition isVisible={isVisible} direction={direction}>
      <Home />
    </PageTransition>
  );
});

HomeScreen.displayName = "HomeScreen";

export default HomeScreen;


