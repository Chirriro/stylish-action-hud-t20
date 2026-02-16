import { BaseSystemAdapter } from "/modules/stylish-action-hud/scripts/systems/base.js";

export class Tormenta20Adapter extends BaseSystemAdapter {
    constructor() {
        super();
        this.systemId = "tormenta20";
        this._injectCustomCSS();
    }

    _injectCustomCSS() {
        const styleId = "sah-t20-custom-style";
        const oldStyle = document.getElementById(styleId);
        if (oldStyle) oldStyle.remove();

        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .ib-sub-menu.t20-hide-tabs #ib-tabs-container { display: none !important; }
            .ib-sub-menu.t20-hide-tabs .ib-scroll-area { margin-top: 5px; }
            div#ib-rich-tooltip {
                max-width: 500px !important;
                width: 100% !important;
                max-height: 100% !important;
            }
            div#ib-rich-tooltip .editor-content {
                font-size: 1.2rem !important;
            }
        `;
        document.head.appendChild(style);
    }

    getDefaultAttributes() {
        return [
            { path: "system.attributes.pv", label: "PV", color: "#e61c34", style: "bar" },
            { path: "system.attributes.pm", label: "PM", color: "#2b6cb0", style: "bar" },
            { path: "system.attributes.defesa.value", label: "Defesa", color: "#718096", style: "badge", icon: "fas fa-shield-alt" }
        ];
    }

    getDefaultLayout() {
        return [
            { systemId: "ataque", label: "Ataques", icon: "fas fa-swords", type: "submenu" },
            { systemId: "magia", label: "Magias", icon: "fas fa-magic", type: "submenu", useSidebar: true },
            { systemId: "poder", label: "Poderes", icon: "fas fa-fist-raised", type: "submenu" },
            { systemId: "pericia", label: "Perícias", icon: "fas fa-dice-d20", type: "submenu", useSidebar: true },
            { systemId: "inventario", label: "Inventário", icon: "fas fa-box-open", type: "submenu", useSidebar: true },
            { systemId: "utilitario", label: "Util", icon: "fas fa-cogs", type: "submenu" }
        ];
    }

    async _getSystemSubMenuData(actor, systemId, menuData) {
        try {
            switch (systemId) {
                case "ataque": return this._getAttacks(actor, menuData.label);
                case "magia": return this._getSpells(actor, menuData.label);
                case "poder": return this._getAbilities(actor, menuData.label);
                case "pericia": return this._getSkills(actor, menuData.label);
                case "inventario": return this._getInventory(actor, menuData.label);
                case "utilitario": return this._getUtility(actor, menuData.label);
                default: return { title: menuData.label, items: [] };
            }
        } catch (e) {
            console.error("Stylish HUD T20 Error:", e);
            return { title: "Erro", items: [] };
        }
    }

    _getAttacks(actor, title) {
        const items = actor.items.filter(i => i.type === "arma" && i.system.equipado).map(i => {
            const passo = i.system.dano?.passo ?? "";
            const tipo = i.system.dano?.tipo ?? "";
            return {
                id: i.id,
                name: i.name,
                img: i.img,
                description: i.system.description?.value || "",
                cost: `<span style="font-size:0.8em; color:#aaa;">${passo} ${tipo}</span>`
            };
        });
        return { title, theme: "red", items };
    }

    _getSpells(actor, title) {
        const items = {};
        const tabLabels = {};
        const subTabLabels = {};

        const spells = actor.items.filter(i => i.type === "magia");
        if (spells.length === 0) return { title, theme: "blue", items: [] };
        
        spells.forEach(spell => {
            const circulo = spell.system.circulo ? String(spell.system.circulo) : "0";
            const sKey = `c${circulo}`; 

            if (!items[sKey]) {
                items[sKey] = {};
                tabLabels[sKey] = circulo === "0" ? "Truques" : `${circulo}º Cír.`;
            }

            if (!items[sKey]["main"]) {
                items[sKey]["main"] = [];
                if (!subTabLabels[sKey]) subTabLabels[sKey] = {};
                subTabLabels[sKey]["main"] = ""; 
            }

            const custoPM = spell.system.pm || spell.system.custo || "";
            items[sKey]["main"].push({
                id: spell.id,
                name: spell.name,
                img: spell.img,
                cost: custoPM ? `<span style="color:#4ecdc4">${custoPM} PM</span>` : "",
                description: spell.system.description?.value || ""
            });
        });

        const sortedKeys = Object.keys(items).sort((a, b) => parseInt(a.replace('c', '')) - parseInt(b.replace('c', '')));
        const sortedItems = {};
        const sortedLabels = {};
        const sortedSubLabels = {};

        sortedKeys.forEach(k => {
            sortedItems[k] = items[k];
            sortedLabels[k] = tabLabels[k];
            sortedSubLabels[k] = subTabLabels[k];
        });

        return { title, theme: "blue t20-hide-tabs", hasTabs: true, hasSubTabs: true, items: sortedItems, tabLabels: sortedLabels, subTabLabels: sortedSubLabels };
    }

    _getAbilities(actor, title) {
        const items = actor.items
            .filter(i => i.type === "poder" || i.type === "poder-distincao")
            .map(i => ({
                id: i.id,
                name: i.name,
                img: i.img,
                description: i.system.description?.value || ""
            }));
        return { title, theme: "orange", items };
    }

    _getSkills(actor, title) {
        const skills = actor.system.pericias;
        if (!skills) return { title, items: [] };

        const configPericias = CONFIG.TORMENTA20?.pericias || {};
        const attrLabels = { all: "Tudo", for: "FOR", des: "DES", con: "CON", int: "INT", sab: "SAB", car: "CAR", nula: "Geral" };
        const attrOrder = ["all", "for", "des", "con", "int", "sab", "car", "nula"];

        const items = {};
        const tabLabels = {};
        const subTabLabels = {};

        items["all"] = { main: [] };
        tabLabels["all"] = "Tudo";
        subTabLabels["all"] = { main: "" };

        Object.entries(skills).forEach(([key, skill]) => {
            let fullName = configPericias[key] || skill.label || key.charAt(0).toUpperCase() + key.slice(1);
            let val = Number(skill.value); 
            if (isNaN(val)) val = 0;
            const sign = val >= 0 ? "+" : "";

            const itemData = {
                id: `skill-${key}`,
                name: fullName,
                img: "icons/svg/d20-grey.svg",
                cost: `<span style="font-weight:bold; color:#eee;">${sign}${val}</span>`,
                description: `Rolar ${fullName}`
            };

            items["all"]["main"].push(itemData);

            const attrKey = skill.atributo || "nula";
            if (!items[attrKey]) {
                items[attrKey] = { main: [] };
                tabLabels[attrKey] = attrLabels[attrKey] || attrKey.toUpperCase();
                subTabLabels[attrKey] = { main: "" }; 
            }
            items[attrKey]["main"].push(itemData);
        });

        Object.keys(items).forEach(key => items[key]["main"].sort((a, b) => a.name.localeCompare(b.name)));

        const sortedItems = {};
        const sortedLabels = {};
        const sortedSubLabels = {};

        attrOrder.forEach(key => {
            if (items[key]) {
                sortedItems[key] = items[key];
                sortedLabels[key] = tabLabels[key];
                sortedSubLabels[key] = subTabLabels[key];
            }
        });

        return { title, theme: "green t20-hide-tabs", hasTabs: true, hasSubTabs: true, items: sortedItems, tabLabels: sortedLabels, subTabLabels: sortedSubLabels };
    }

    _getInventory(actor, title) {
        const categories = { equipamento: "Equip.", consumivel: "Consum.", tesouro: "Tesouro", arma: "Armas", armadura: "Armaduras" };
        const items = {};
        const tabLabels = {};
        const subTabLabels = {};
        const validTypes = ["equipamento", "consumivel", "tesouro", "arma", "armadura"];

        actor.items.filter(i => validTypes.includes(i.type)).forEach(i => {
            const key = i.type;
            if (!items[key]) {
                items[key] = { main: [] };
                tabLabels[key] = categories[key] || key;
                subTabLabels[key] = { main: "" };
            }

            const qtd = i.system.quantidade ?? i.system.qtd ?? 1;

            items[key]["main"].push({
                id: i.id,
                name: i.name,
                img: i.img,
                cost: qtd > 1 ? `x${qtd}` : "",
                description: i.system.description?.value || ""
            });
        });

        return { title, theme: "red t20-hide-tabs", hasTabs: true, hasSubTabs: true, items, tabLabels, subTabLabels };
    }

    _getUtility(actor, title) {
        const items = [];
        const initMod = Number(actor.system.iniciativa?.value ?? 0);
        const initSign = initMod >= 0 ? "+" : "";
        
        items.push({
            id: "roll-initiative",
            name: "Iniciativa",
            img: "icons/svg/clockwork.svg",
            cost: `<span style="font-weight:bold;">${initSign}${initMod}</span>`,
            description: "Rolar Iniciativa"
        });

        const attrMap = { for: "Força", des: "Destreza", con: "Constituição", int: "Inteligência", sab: "Sabedoria", car: "Carisma" };
        const attributes = actor.system.atributos;
        if (attributes) {
            Object.entries(attrMap).forEach(([key, label]) => {
                const attrData = attributes[key];
                if (attrData) {
                    let mod = Number(attrData.value ?? attrData.mod ?? 0);
                    if (isNaN(mod)) mod = 0;
                    const sign = mod >= 0 ? "+" : "";
                    
                    items.push({
                        id: `attr-${key}`,
                        name: label,
                        img: "icons/svg/d20-highlight.svg",
                        cost: `<span style="font-weight:bold;">${sign}${mod}</span>`,
                        description: `Teste de ${label}`
                    });
                }
            });
        }
        return { title, theme: "gray", items };
    }

    async useItem(actor, itemId, event) {
        if (itemId.startsWith("skill-")) {
            const skillKey = itemId.replace("skill-", "");
            if (actor.rollPericia) return actor.rollPericia(skillKey);
            if (actor.rollSkill) return actor.rollSkill(skillKey);
            return;
        }

        if (itemId.startsWith("attr-")) {
            const attrKey = itemId.replace("attr-", "");
            if (actor.rollAtributo) return actor.rollAtributo(attrKey);
            return;
        }

        if (itemId === "roll-initiative") {
            return actor.rollInitiative({createCombatants: true});
        }

        const item = actor.items.get(itemId);
        if (item) {
            if (item.roll) return item.roll();
            if (item.use) return item.use();
            return item.sheet.render(true);
        }
    }
}
