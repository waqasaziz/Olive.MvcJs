import FormAction from "olive/mvc/formAction"
import Url from "olive/components/url"

// For configuration see:
// http://markusslima.github.io/bootstrap-filestyle/ 
// https://blueimp.github.io/jQuery-File-Upload/

export default class FileUpload {
    input: JQuery;
    container: JQuery;
    idInput: JQuery;
    deleteButton: JQuery;
    progressBar: JQuery;
    currentFileLink: JQuery;
    existingFileNameInput: JQuery;
    fileLabel: JQuery;

    public static enable(selector: JQuery) { selector.each((i, e) => new FileUpload($(e)).enable()); }

    constructor(targetInput: JQuery) {
        this.input = targetInput;
        this.container = this.input.closest(".file-upload");
        this.idInput = this.container.find("input.file-id");
        this.fileLabel = this.input.parent().find(':text');
        this.deleteButton = this.container.find(".delete-file").click(e => this.onDeleteButtonClicked());
    }

    enable() {
        this.input.attr("data-url", Url.effectiveUrlProvider("/upload", this.input));
        this.input.filestyle({ buttonBefore: true });
        this.container.find('.bootstrap-filestyle > input:text').wrap($("<div class='progress'></div>"));
        this.progressBar = this.container.find(".progress-bar");
        this.container.find('.bootstrap-filestyle > .progress').prepend(this.progressBar);
        if (this.idInput.val() != "REMOVE") {
            this.currentFileLink = this.container.find('.current-file > a');
            this.existingFileNameInput = this.container.find('.bootstrap-filestyle > .progress > input:text');
        }

        if (this.hasExistingFile() && this.existingFileNameInput.val() == "")
            this.showExistingFile();

        let options = {
            dataType: 'json',
            dropZone: this.container,
            replaceFileInput: false,
            drop: this.onDragDropped.bind(this),
            change: this.onChange.bind(this),
            progressall: this.onProgressAll.bind(this),
            error: this.onUploadError,
            success: this.onUploadSuccess.bind(this),
            xhrFields: {withCredentials: true}
        };

        let maxFileSize:number = Number( this.input.attr('data-maxfilesize'));
        if (!isNaN(maxFileSize)) 
            options = $.extend(options, { maxFileSize:maxFileSize });

        let acceptedFileTypes:string =  this.input.data('data-acceptedfiletypes');
        if (acceptedFileTypes !== undefined) 
                options = $.extend(options, { acceptedfiletypes:acceptedFileTypes });

        this.input.fileupload(options);
    }

    hasExistingFile(): boolean {
        if (!this.currentFileLink) return false;
        let name = this.currentFileLink.text();
        if (!name) return false;
        if (name === "«UNCHANGED»") return false;
        if (name === "NoFile.Empty") return false;
        return true;
    }

    showExistingFile() {
        this.deleteButton.show();
        this.progressBar.width('100%');

        this.existingFileNameInput
            .val(this.currentFileLink.text())
            .removeAttr('disabled')
            .addClass('file-target')
            .click(() => this.currentFileLink[0].click());
    }

    removeExistingFile() {
        if (!this.hasExistingFile()) return;
        this.existingFileNameInput.removeClass('file-target').attr('disabled', 'true').off();
    }

    onDeleteButtonClicked() {
        this.deleteButton.hide();
        this.idInput.val("REMOVE");
        this.progressBar.width(0);
        this.input.filestyle('clear');
        this.removeExistingFile();
    }

    onDragDropped(e, data) {
        if (this.fileLabel.length > 0 && data.files.length > 0) {
            this.fileLabel.val(data.files.map(x => x.name));
        }
    }

    onProgressAll(e, data: any) {
        let progress = parseInt((data.loaded / data.total * 100).toString(), 10);
        this.progressBar.width(progress + '%');
    }

    onUploadError(jqXHR: JQueryXHR, status: string, error: string) {
        FormAction.onAjaxResponseError(jqXHR, status, error);
        this.fileLabel.val('');
    }

    onUploadSuccess(response) {
        if (response.Error) {
            FormAction.onAjaxResponseError(<any>{ responseText: response.Error }, "error", response.Error);
            this.fileLabel.val('');
        }
        else {
            if (this.input.is("[multiple]")) this.idInput.val(this.idInput.val() + "|file:" + response.Result.ID);
            else this.idInput.val("file:" + response.Result.ID);
            this.deleteButton.show();
        }
    }

    onChange(e, data) {
        this.progressBar.width(0);
        this.removeExistingFile();
    }
}
