import React from "react";
import "./App.css";
import { Viewer2DHost } from "./Viewer2DHost";

function App() {
  return (
    <div className="app-container">
      <div className="app-title">title</div>
      <div className="app-tools">tools</div>
      <div className="app-viewer">
        <Viewer2DHost></Viewer2DHost>{" "}
      </div>
    </div>
  );
}

export default App;
