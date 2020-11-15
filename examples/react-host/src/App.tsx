import React from "react";
import "./App.css";
import { Tab2 } from "./tabs/tab1";
import { Tab1 } from "./tabs/tab2";
import { Viewer2DHost } from "./Viewer2DHost";

const tabs = [
  {
    name: "Main thread + workers mix",
    view: () => <Viewer2DHost></Viewer2DHost>,
  },
  { name: "tab22", view: () => <Tab2></Tab2> },
];

const App = () => {
  const [selectedTab, setSelectedTab] = React.useState(0);
  return (
    //switch
    <div className="app-container">
      <div className="app-tabs">
        {tabs.map((t, i) => (
          <button
            className="app-tab-button"
            key={i}
            onClick={() => setSelectedTab(i)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="app-viewer">{tabs[selectedTab].view()}</div>
    </div>
  );
};

export default App;
