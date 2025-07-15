{{- define "payment-service.name" -}}
payment-service
{{- end }}

{{- define "payment-service.fullname" -}}
{{ include "payment-service.name" . }}
{{- end }}
