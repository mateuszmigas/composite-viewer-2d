import React from "react";
import "./App.css";
import { adder } from "./viewer2d";

function App() {
  return (
    <div className="App">
      <header className="App-header">{adder(2, 4)}</header>
    </div>
  );
}

export default App;
