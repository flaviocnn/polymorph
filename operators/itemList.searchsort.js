function __itemlist_searchsort() {
    //search
    this.searchtemplate = htmlwrap(`<span style="display:block; width:100%;">
    <span></span>
    <button disabled>&#128269;</button>
    </span>`);
    this._searchtemplate = this.searchtemplate.querySelector("span");
    this.taskListBar.insertBefore(this.searchtemplate, this.template.nextElementSibling);

    //Managing the search
    let searchCapacitor = new capacitor(1000, 300, () => {
        //filter the items
        let searchboxes = Array.from(this.searchtemplate.querySelectorAll("input"));
        let amSearching = false;
        for (let i = 0; i < searchboxes.length; i++) {
            if (searchboxes[i].value != "") {
                amSearching = true;
            }
        }
        if (amSearching) {
            this.searchtemplate.querySelector("button").innerHTML = "&#9003;";
            this.searchtemplate.querySelector("button").disabled = false;
        } else {
            this.searchtemplate.querySelector("button").innerHTML = "&#128269;";
            this.searchtemplate.querySelector("button").disabled = true;
            //dont return yet, we have to reset everything
        }

        let items = this.getRenderedItems();
        let toShowItems = [];
        items.forEach((v) => {
            let it = polymorph_core.items[v];
            let el = this.taskList.querySelector(`[data-id="${v}"]`);
            el.style.display = "none";
            for (let i = 0; i < searchboxes.length; i++) {
                //only search by text for now
                if (searchboxes[i].value) {
                    switch (this.settings.properties[searchboxes[i].dataset.role]) {
                        case "text":
                            if (it[searchboxes[i].dataset.role] && it[searchboxes[i].dataset.role].indexOf(searchboxes[i].value) > -1) {
                                toShowItems.push(el);
                            }
                            break;
                    }
                }
            }
        });
        toShowItems.forEach((v) => {
            let e = v;
            while (e != this.taskList) {
                e.style.display = "block";
                e = e.parentElement;
            }
        });
    });
    this.searchtemplate.addEventListener("keyup", searchCapacitor.submit);
    this.searchtemplate.querySelector("button").addEventListener("click", () => {
        let searchboxes = Array.from(this.searchtemplate.querySelectorAll("input"));
        searchboxes.forEach(v => { v.value = ""; });
        searchCapacitor.submit();
    })


    ///sorting
    this.indexOf = (id) => {
        let childs = this.taskList.children;
        for (let i = 0; i < childs.length; i++) {
            if (childs[i].dataset.id == id) return i;
        }
        return -1;
    }

    this._sortItems = () => {
        if (!this.container.visible()) return;
        if (this.settings.implicitOrder) {
            this.settings.sortby = this.settings.filterProp;
        }
        if (this.settings.sortby) {
            //collect all items
            let itms = this.taskList.querySelectorAll(`[data-id]`);
            let its = [];
            for (let i = 0; i < itms.length; i++) {
                cpp = {
                    id: itms[i].dataset.id,
                    dt: polymorph_core.items[itms[i].dataset.id][this.settings.sortby]
                };
                its.push(cpp);
            }
            //sort everything based on the filtered property.
            switch (this.settings.properties[this.settings.sortby]) {
                case "date":
                    let dateprop = this.settings.sortby;
                    for (let i = 0; i < its.length; i++) {
                        //we are going to upgrade all dates that don't match protocol)
                        if (its[i].dt && its[i].dt.date) {
                            if (typeof its[i].dt.date == "number") {
                                polymorph_core.items[its[i].id][dateprop].date = [{
                                    date: polymorph_core.items[its[i].id][dateprop].date
                                }];
                            }
                            if (polymorph_core.items[its[i].id][dateprop].date[0]) {
                                its[i].date = polymorph_core.items[its[i].id][dateprop].date[0].date;
                                //check for repetition structure
                                if (its[i].dt.datestring.indexOf("(") != -1) {
                                    //evaluate the repetition
                                    its[i].date = dateParser.richExtractTime(its[i].dt.datestring)[0].date;
                                }
                            }
                            else its[i].date = Date.now() * 10000;
                        } else its[i].date = Date.now() * 10000;
                    }
                    its.sort((a, b) => {
                        return a.date - b.date;
                    });
                    break;
                case "text":
                    for (let i = 0; i < its.length; i++) {
                        if (!its[i].dt) its[i].dt = "";
                    }
                    its.sort((a, b) => {
                        return a.dt.toString().localeCompare(b.dt.toString());
                    });
                    break;
                default: // probably implicit ordering
                    its.sort((a, b) => {
                        return a.dt - b.dt;
                    });
            }
            //remember focused item
            let fi = this.taskList.querySelector(":focus");
            //also remember cursor position
            let cp;
            if (fi) cp = fi.selectionStart || 0;
            //rearrange items
            //dont do this if subitem
            for (let i = 0; i < its.length; i++) {
                let span = this.taskList.querySelector("[data-id='" + its[i].id + "']")
                if (span.parentElement == this.taskList) this.taskList.appendChild(span);
            }
            //return focused item
            if (fi) {
                fi.focus();
                try {
                    fi.selectionStart = cp;
                } catch (e) {
                }
            }
        }
    }

    this.sortcap = new capacitor(500 + isPhone() * 1000, 1000, this._sortItems);

    this.sortItems = () => {
        this.sortcap.submit();
    }

    this.setSearchTemplate = (htmlstring) => {
        this._searchtemplate.innerHTML = htmlstring;
        for (let i in this.settings.propertyWidths) {
            this._searchtemplate.querySelector(`[data-contains-role=${i}]`).style.width = this.settings.propertyWidths[i];
        }
    }

}