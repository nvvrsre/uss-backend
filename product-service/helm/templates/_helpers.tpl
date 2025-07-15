{{- define "product-service.name" -}}
product-service
{{- end }}

{{- define "product-service.fullname" -}}
{{ include "product-service.name" . }}
{{- end }}
