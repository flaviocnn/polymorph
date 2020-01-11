//deps: core.container.js
//add a context menu configuration button to the container menu
polymorph_core.showContextMenu = (container, settings, options) => {
    container._tempCtxSettings = settings;//do this otherwise contextmenu will always point to first item contextmenu'ed... but what is this?
    /*
    settings = {
        x:int
        y:int
        id: id
    }
    */
    //This should be configurable in future.
    let commandStrings = polymorph_core.currentDoc.contextMenuItems || [];
    //add operator recommends
    commandStrings.push.apply(commandStrings, options);
    //add users' stuff
    let currentContainer = container;
    do {
        if (currentContainer instanceof polymorph_core.container) {
            commandStrings.push.apply(commandStrings, container.settings.commandStrings);
        }
        currentContainer = currentContainer.parent;
    } while (currentContainer != polymorph_core);
    // format: 
    /*
        polymorph_core, operator, item = or just dot.
        "callables::polymorph_core.deleteItem(for example)",
        "Open subview::operator.openSubview",
        "Custom function::item.prop=value OR item.prop=()=>{eval}",
        "Custom editable::item.edit(item.style.background)",
        "Custom global setter::polymorph_core.prop=value or ()=>{eval} or (item)=>{fn}"
        "Menu::submenu::action"
    */

    let setItemProp = (prop, val, assignment, LHS = polymorph_core.items[container._tempCtxSettings.id]) => {
        //expect either item.potato.tomato from assignment or potato.tomato.
        if (assignment) {
            prop = prop.slice(prop.indexOf(".") + 1);//nerf the first item
        }
        let props = prop.split(".");
        let itm = LHS;
        for (let i = 0; i < props.length - 1; i++) {
            if (!itm[props[i]]) itm[props[i]] = {};
            itm = itm[props[i]];
        }
        itm[props[props.length - 1]] = val;
        polymorph_core.fire("updateItem", { id: container._tempCtxSettings.id });
    }
    let getItemProp = (propStr) => {
        //only really used for edit; so getItemProp only.
        let props = propStr.split(".");
        let itm = polymorph_core.items[container._tempCtxSettings.id];
        for (let i = 0; i < props.length; i++) {
            if (!itm[props[i]]) {
                itm = "";
                break;
            }
            itm = itm[props[i]];
        }
        return itm;
    }

    let ctxMenu;
    if (container.cacheCTXMenuStrings == JSON.stringify(commandStrings)) {
        ctxMenu = container.ctxMenuCache;
    } else {
        //rebuild ctxMenu including handlers
        ctxMenu = htmlwrap(`<div class="_ctxbox_">
        <style>
        div._ctxbox_{
            background:white
        }
        div._sctxbox_{
            position:absolute;
            left: 100%;
            background:white;
        }
        </style>
        </div>`);
        commandStrings.map((v, i) => {
            let cctx = ctxMenu;
            let parts = v.split("::");
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].indexOf(".") == -1) {
                    _cctx = cctx.querySelector(`[data-name="${parts[i]}"]`);
                    if (_cctx) {
                        cctx = _cctx.children[1];
                    } else {
                        _cctx = htmlwrap(`<div class="_ctxbox_" data-name="${parts[i]}"><span>${parts[i]}</span><div class="_sctxbox_"></div></div>`);
                        cctx.appendChild(_cctx);
                        cctx = _cctx;
                    }
                } else {
                    if (/^item.edit\(.+\)$/.exec(parts[i]) != null) {
                        //its an editable, so also put in an input
                        //remove the text inside first
                        cctx.children[0].remove();
                        cctx.insertBefore(htmlwrap(`<input data-property="${/item.edit\((.+)\)/.exec(parts[i])[1]}" placeholder="${parts[i - 1]}"></input>`), cctx.children[0])
                    }
                    break;
                }
            }
            cctx.dataset.index = i;
        })
        ctxMenu.addEventListener("click", (e) => {
            if (e.target.parentElement.dataset.index) {
                let thisCSTR = commandStrings[e.target.parentElement.dataset.index].split("::");
                for (let i = 0; i < thisCSTR.length; i++) {
                    if (thisCSTR[i].indexOf(".") != -1) {
                        thisCSTR.splice(0, i);
                        thisCSTR = thisCSTR.join("::");
                        break;
                    }
                }
                let _LHS = thisCSTR.split(".")[0];
                let internalVariable = thisCSTR.split(".")[1];
                switch (_LHS) {
                    case "polymorph_core":
                        LHS = polymorph_core;
                        break;
                    case "item":
                        LHS = polymorph_core.items[container._tempCtxSettings.id];
                        break;
                    case "operator":
                        LHS = container.operator;
                        break;
                    default:
                        return;
                }
                if (thisCSTR.slice(thisCSTR.indexOf(".") + 1).indexOf("=") != -1) {
                    //assignment
                    var RHS = thisCSTR.slice(thisCSTR.indexOf("=") + 1);
                    let internalVariable = thisCSTR.slice(thisCSTR.indexOf(".") + 1, thisCSTR.indexOf("="));
                    if (RHS.indexOf("(") != -1) {
                        setItemProp(internalVariable, eval(`function __CTX_evaluator(e,container){` + RHS + `}`)(container._tempCtxSettings, container), false, LHS)
                    } else {
                        setItemProp(internalVariable, RHS, false, LHS);
                    }
                } else {
                    if (_LHS != "item") {
                        LHS.ctxCommands[internalVariable](container._tempCtxSettings, container);
                    }
                }
            }
            if (e.target.tagName != "INPUT") ctxMenu.style.display = "none";
        });
        ctxMenu.addEventListener("input", (e) => {
            setItemProp(e.target.dataset.property, e.target.value);
        })
        //TODO: on inputs
        container.ctxMenuCache = ctxMenu;
        container.cacheCTXMenuStrings = JSON.stringify(commandStrings);
        container.div.addEventListener("click", (e) => {
            if (!e.path.includes(ctxMenu)) ctxMenu.style.display = "none";
        })
    }
    //actually show it
    container.div.appendChild(container.ctxMenuCache);
    container.ctxMenuCache.style.display = "block";
    container.ctxMenuCache.style.position = "absolute";
    container.ctxMenuCache.style.top = settings.y;
    container.ctxMenuCache.style.left = settings.x;
    //load all the inputs
    Array.from(container.ctxMenuCache.querySelectorAll("input")).forEach(i => {
        i.value = getItemProp(i.dataset.property);
    })

}

polymorph_core.ctxCommands = {
    "deleteItem": (e, container) => {
        container._fire("deleteItem", { id: e.id });
    }
}

polymorph_core.container.prototype.registerContextMenu = function (el, delegateFilter) {
    el.addEventListener("contextmenu", (e) => {
        let itm = delegateFilter(e.target);
        if (itm) {
            e.preventDefault();
            let pbr = el.getRootNode().host.getBoundingClientRect();
            itm.e.x = e.clientX - pbr.x;
            itm.e.y = e.clientY - pbr.y;
            polymorph_core.showContextMenu(this, itm.e, itm.ls);
        }
    })
}