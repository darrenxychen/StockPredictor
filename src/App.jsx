import { useState } from "react";
import "./App.css";
import SlidingObject from "./components/SlidingObject";

function App() {
  return (
    <>
      <div>
        <header>
          <h1>Stock Predictor W</h1>
        </header>
        <main>
          <SlidingObject />
        </main>
        <footer>
          <p>
            Made by Darren Chen and Jimmy Moore
          </p>
        </footer>
      </div>
    </>
  );
}

export default App;
