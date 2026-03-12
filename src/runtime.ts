import { createPluginRuntimeStore } from "openclaw/plugin-sdk";
import type { PluginRuntime } from "openclaw/plugin-sdk";

const { setRuntime: setNapCatRuntime, getRuntime: getNapCatRuntime } =
  createPluginRuntimeStore<PluginRuntime>("NapCat runtime not initialized");
export { getNapCatRuntime, setNapCatRuntime };
