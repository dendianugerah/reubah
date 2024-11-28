package handlers

import (
	"html/template"
	"net/http"
)

var templates = template.Must(template.ParseFiles(
	"templates/index.html",
	"templates/components/nav.html",
	"templates/components/tabs.html",
	"templates/components/upload.html",
	"templates/components/quick-actions.html",
	"templates/components/options-panel.html",
	"templates/components/progress-result.html",
))

func ShowUploadForm(w http.ResponseWriter, r *http.Request) {
	if err := templates.ExecuteTemplate(w, "index.html", nil); err != nil {
		http.Error(w, "Failed to render template", http.StatusInternalServerError)
	}
}