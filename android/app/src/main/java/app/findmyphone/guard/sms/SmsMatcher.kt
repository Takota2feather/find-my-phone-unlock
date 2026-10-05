package app.findmyphone.guard.sms

/**
 * Kotlin port of src/lib/fmp/sms-matcher.ts. Keep both in sync — the web tests
 * document the expected behaviour.
 */
object SmsMatcher {
    data class Result(val actionable: Boolean, val reason: String)

    private val FILLER = setOf("please", "pls", "plz", "now", "hey", "hi", "urgent", "asap", "help", "ok", "okay")
    private val DISCUSSION = Regex(
        "\\b(don'?t|do not|never|did you|what is|what's|is it|how does|how do|app|feature|said|says|saying|typed|type|text me|joke|lol|haha|meme)\\b",
    )

    fun normalize(s: String) = s.lowercase()
        .replace(Regex("[\u2019']"), "'")
        .replace(Regex("[^a-z0-9' ]+"), " ")
        .replace(Regex("\\s+"), " ").trim()

    fun match(message: String, phrase: String, contextAware: Boolean): Result {
        val msg = normalize(message)
        val p = normalize(phrase)
        if (p.isEmpty()) return Result(false, "No trigger phrase configured.")
        if (msg.isEmpty()) return Result(false, "Empty message.")
        if (msg == p) return Result(true, "Exact phrase match.")
        if (!contextAware) return Result(false, "Exact-match mode: message is not the phrase alone.")
        val idx = " $msg ".indexOf(" $p ")
        if (idx == -1) return Result(false, "Phrase not found.")
        if (message.contains('?')) return Result(false, "Looks like a question about the phrase.")
        if (DISCUSSION.containsMatchIn(msg)) return Result(false, "Message discusses the phrase.")
        if (Regex("[\"\u201C\u201D'\u2018\u2019]").containsMatchIn(message)) return Result(false, "Phrase is quoted.")
        val end = (idx + p.length).coerceAtMost(msg.length)
        val rest = (msg.substring(0, idx) + " " + msg.substring(end)).split(" ").filter { it.isNotBlank() }
        if (rest.size > 3) return Result(false, "Too much surrounding text.")
        val extra = rest.firstOrNull { it !in FILLER }
        if (extra != null) return Result(false, "Unrecognized word near the phrase.")
        return Result(true, "Clear request with filler words.")
    }
}
