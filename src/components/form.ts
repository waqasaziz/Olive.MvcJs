﻿import Url from 'olive/components/url'
import Validate from 'olive/components/validate'
import Waiting from 'olive/components/waiting'
import AjaxRedirect from 'olive/mvc/ajaxRedirect'

export default class Form {

    public static currentRequestUrlProvider: (() => string) = () => window.location.pathAndQuery();

    public static enableDefaultButtonKeyPress(selector: JQuery) { selector.off("keypress.default-button").on("keypress.default-button", (e) => this.DefaultButtonKeyPress(e)); }

    public static enablecleanUpNumberField(selector: JQuery) { selector.off("blur.cleanup-number").on("blur.cleanup-number", (e) => this.cleanUpNumberField($(e.currentTarget))); }

    public static enablesubmitCleanGet(selector: JQuery) { selector.off("submit.clean-up").on("submit.clean-up", (e) => this.submitCleanGet(e)); }

    static getCleanFormData(form: JQuery): JQuerySerializeArrayElement[] {
        let result: JQuerySerializeArrayElement[] = [];

        let items = form.serializeArray();

        let groupedByKeys = Array.groupBy(items, i => i.name.toLowerCase());

        for (let i in groupedByKeys) {
            let group = groupedByKeys[i];
            if (typeof (group) == 'function') continue;
            let key = group[0].name;
            let values = group.map(item => item.value).filter(v => v);

            // Fix for MVC checkboxes:
            if ($("input[name='" + key + "']", form).is(":checkbox") && values.length == 2 && values[1] == 'false'
                && (values[0] == 'true' || values[0] == 'false')) values.pop();
            result.push({ name: key, value: values.join("|") });
        }

        // Fix for multi-select:
        // If a multi-select control has no value, we should return empty value for it.
        // The default serializeArray() function just ignores it.
        $("select[multiple]", form).each((i, e) => {
            var key = $(e).attr("name");
            if (result.filter(v => v.name === key).length === 0)
                result.push({ name: key, value: "" });
        });


        return result;
    }

    static cleanJson(str): string {
        return str.replace(/(\s*?{\s*?|\s*?,\s*?)(['"])?([a-zA-Z0-9]+)(['"])?:/g, '$1"$3":')
    };

    public static getPostData(trigger: JQuery): JQuerySerializeArrayElement[] {
        let form = trigger.closest("[data-module]");
        if (!form.is("form")) form = $("<form />").append(form.clone(true));
        let data = Form.getCleanFormData(form);
        // If it's master-details, then we need the index.
        let subFormContainer = trigger.closest(".subform-item");
        if (subFormContainer) {
            data.push({
                name: "subFormIndex",
                value: subFormContainer.closest(".horizontal-subform, .vertical-subform").find(".subform-item").index(subFormContainer).toString()
            });
        }

        data.push({ name: "current.request.url", value: this.currentRequestUrlProvider() });
        return data;
    }

    static DefaultButtonKeyPress(event: JQueryEventObject): boolean {
        if (event.which === 13) {
            let target = $(event.currentTarget);
            let button = target.closest("[data-module]").find('[default-button]:first'); // Same module
            if (button.length == 0) button = $('[default-button]:first') // anywhere
            button.click();
            return false;
        } else return true;
    }

    static cleanUpNumberField(field: JQuery) {
        let domElement = <HTMLInputElement>field.get(0);
        field.val(field.val().replace(/[^\d.-]/g, ""));
    }

    static submitCleanGet(event: JQueryEventObject) {
        let form = $(event.currentTarget);
        if (Validate.validateForm(form) == false) { Waiting.hide(); return false; }

        let formData = Form.getCleanFormData(form).filter(item => item.name != "__RequestVerificationToken");

        let url = Url.removeEmptyQueries(form.attr('action'));

        try {

            form.find("input:checkbox:unchecked").each((ind, e) => url = Url.removeQuery(url, $(e).attr("name")));

            for (let item of formData)
                url = Url.updateQuery(url, item.name, item.value);

            url = Url.removeEmptyQueries(url);

            if (form.is("[data-redirect=ajax]")) AjaxRedirect.go(url, form, false, false, true);
            else location.href = url;
        }
        catch (error) {
            console.log(error);
            alert(error);
        }
        return false;
    }
}
