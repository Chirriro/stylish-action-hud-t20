import { Tormenta20Adapter } from "./tormenta20.js";

Hooks.once("init", () => {
    Hooks.on("stylish-action-hud.registerSystemAdapters", (registry) => {
        console.log("Stylish Action HUD - T20 | Registering Tormenta20 Adapter");
        
        registry.registerSystemAdapter("tormenta20", Tormenta20Adapter, {
            priority: 0,
            source: "stylish-action-hud-t20"
        });
    });
});