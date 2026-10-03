import agents from "./agents.json";
import base from "./base.json";
import crm from "./crm.json";
import settings from "./settings.json";
import shell from "./shell.json";

export default { ...base, ...crm, ...settings, ...agents, ...shell };
