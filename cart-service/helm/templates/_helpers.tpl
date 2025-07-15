{{- define "cart-service.name" -}}
cart-service
{{- end }}

{{- define "cart-service.fullname" -}}
{{ include "cart-service.name" . }}
{{- end }}
