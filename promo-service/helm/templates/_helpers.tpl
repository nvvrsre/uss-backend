{{- define "promo-service.name" -}}
promo-service
{{- end }}

{{- define "promo-service.fullname" -}}
{{ include "promo-service.name" . }}
{{- end }}
