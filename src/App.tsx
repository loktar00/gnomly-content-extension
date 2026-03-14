import { Route, Switch, Link } from "wouter";
import { IoNewspaperOutline, IoSettingsOutline, IoChatbubblesOutline  } from "react-icons/io5";
import { ToastContainer } from 'react-toastify';
import { Home } from "./views/Home/Home.tsx";
import { Settings } from "./views/Settings";
import { PromptManager } from "./views/PromptManager/PromptManager";
import { Summary } from "./views/Summary/Summary.tsx";
import { ConversationsView } from "./views/Home/ConversationsView.tsx";

export const App = () =>  (
    <body>
        <div className="side-panel-container">
            <header>
                <Link href="/">
                    <h1 className="title">
                        <img src="/icons/icon64.png" alt="Gnomly" /> Gnomly
                    </h1>
                </Link>
                <div className="header-buttons">
                    <Link to="/conversations">
                        <button className="settings-btn" title="Recent Conversations"><IoChatbubblesOutline size={24} /></button>
                    </Link>
                    <Link to="/prompt-manager">
                        <button id="manage-prompts" className="settings-btn" title="Manage Prompts"><IoNewspaperOutline size={24} /></button>
                    </Link>
                    <Link to="/settings">
                        <button id="open-options" className="settings-btn" title="Settings"><IoSettingsOutline size={24} /></button>
                    </Link>
                </div>
            </header>
            <div className="panel-content" id="panel-content">
                <Switch>
                    <Route path="/">
                        <Home />
                    </Route>
                    <Route path="/settings">
                        <Settings />
                    </Route>
                    <Route path="/prompt-manager">
                        <PromptManager />
                    </Route>
                    <Route path="/conversations">
                        <ConversationsView />
                    </Route>
                    <Route path="/summary">
                        <Summary />
                    </Route>
                    <Route>
                        <Home />
                    </Route>
                </Switch>
            </div>
        </div>
        <ToastContainer theme="dark" />
    </body>
);
