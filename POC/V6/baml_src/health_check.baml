// Minimal connectivity probe used by the health-check service.
// Kept deliberately trivial so it completes as fast as possible.

class HealthPingResult {
  ok bool
}

function HealthPing() -> HealthPingResult {
  client ActiveModel
  prompt #"
    Reply with {"ok": true} and nothing else.
    {{ ctx.output_format }}
  "#
}
