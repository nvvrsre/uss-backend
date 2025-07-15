{{- define "order-service.name" -}}
order-service
{{- end }}

{{- define "order-service.fullname" -}}
{{ include "order-service.name" . }}
{{- end }}
