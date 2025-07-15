{{- define "catalog-service.name" -}}
catalog-service
{{- end }}

{{- define "catalog-service.fullname" -}}
{{ include "catalog-service.name" . }}
{{- end }}
