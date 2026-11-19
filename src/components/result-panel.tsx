import type { Messages } from "@/lib/i18n"
import type { Assessment, DexterityCheck, StatLine } from "@/lib/quality"
import { isPercentStat } from "@/lib/stats"
import type { CodexItem } from "@/lib/types"

/** Mostra a porcentagem, a conta de cada status e a projeção até Godforged. */
export function ResultPanel(props: {
  result: Assessment
  item: CodexItem
  levelAssumed: boolean
  text: Messages
}) {
  const { result, item, levelAssumed, text } = props
  const tier = text.tier[result.tier]
  return (
    <section className="result">
      <p className="headline">
        {text.headline(result.quality, tier).split(String(result.quality) + "%")[0]}
        <strong>{result.quality}%</strong>
        {text.headline(result.quality, tier).split(String(result.quality) + "%")[1]}
      </p>
      <p className="note">{text.compare(item.name)}</p>
      {levelAssumed ? <p className="warn">{text.levelAssumed}</p> : null}
      {result.coarse ? <p className="warn">{text.coarse}</p> : null}
      {!item.upgradable ? <p className="note">{text.notUpgradable}</p> : null}
      {result.boss && result.curvesAgree ? (
        <p className="note">
          {text.bossCurve}
          {result.level === 1 ? text.bossSameAtLevel1 : null}
        </p>
      ) : null}
      {result.level > 1 && !result.curvesAgree ? (
        <p className="note">{result.boss ? text.bossFit : text.normalFit}</p>
      ) : null}
      <ul className="lines">
        {result.lines.map((line) => (
          <li key={line.key}>{lineText(line, result.quality, text)}</li>
        ))}
        {result.dexterity ? <li>{dexText(result.dexterity, text)}</li> : null}
      </ul>
      {result.projection.length > 0 ? <Projection result={result} text={text} /> : null}
      <p className="note">
        <a href={`https://playorna.com${item.url}`} target="_blank" rel="noopener noreferrer">
          {text.codexLink}
        </a>
      </p>
    </section>
  )
}

function lineText(line: StatLine, quality: number, text: Messages): string {
  const label = text.stat[line.key]
  if (line.percentStat) return percentLine(label, line, quality, text)
  const percent = line.matches ? quality : line.percent
  return line.matches
    ? text.ratio(label, line.shown, line.reference, percent)
    : text.ratioMismatch(label, line.shown, line.reference, percent)
}

function percentLine(label: string, line: StatLine, quality: number, text: Messages): string {
  if (line.matches) return text.percentOk(label, line.shown, quality, line.reference)
  return text.percentBad(label, line.shown, quality, line.predicted)
}

function dexText(dex: DexterityCheck, text: Messages): string {
  const label = text.stat.dexterity
  if (dex.matches) return text.dexOk(label, dex.shown)
  return text.dexBad(label, dex.shown, dex.predicted)
}

function Projection(props: { result: Assessment; text: Messages }) {
  const rows = props.result.projection[0]?.stats ?? []
  return (
    <div className="table-wrap">
      <table>
        <caption>{props.text.projectionCaption}</caption>
        <thead>
          <tr>
            <th>{props.text.statColumn}</th>
            {props.result.projection.map((column) => (
              <th key={column.label}>{props.text.milestone[column.label]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key}>
              <th scope="row">{props.text.stat[row.key]}</th>
              {props.result.projection.map((column) => (
                <td key={column.label}>{formatProjected(column.stats[index], row.key)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatProjected(
  stat: { key: string; value: number } | undefined,
  key: StatLine["key"],
): string {
  if (!stat) return "—"
  return isPercentStat(key) ? `${stat.value}%` : String(stat.value)
}
