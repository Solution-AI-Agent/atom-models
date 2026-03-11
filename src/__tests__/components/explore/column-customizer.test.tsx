import { COLUMNS } from '@/components/explore/column-customizer'

describe('ColumnCustomizer', () => {
  it('should have benchmark keys in COLUMNS constant', () => {
    const keys = COLUMNS.map((c) => c.key)
    expect(keys).toContain('mmlu')
    expect(keys).toContain('gpqa')
    expect(keys).toContain('swe_bench')
    expect(keys).toContain('aime')
    expect(keys).toContain('hle')
    expect(keys).toContain('mgsm')
    expect(keys).toContain('kmmlu')
    expect(keys).toContain('truthfulqa')
    expect(keys).toContain('bfcl')
    expect(keys).toContain('ifeval')
    expect(keys).toContain('ruler')
    expect(keys).not.toContain('scores')
  })

  it('should include individual benchmark labels derived from BENCHMARKS', () => {
    const labels = COLUMNS.map((c) => c.label)
    expect(labels).toContain('MMLU')
    expect(labels).toContain('GPQA')
    expect(labels).toContain('SWE-bench')
    expect(labels).toContain('AIME')
    expect(labels).toContain('HLE')
    expect(labels).toContain('MGSM')
    expect(labels).toContain('KMMLU')
    expect(labels).toContain('TruthfulQA')
    expect(labels).toContain('BFCL')
    expect(labels).toContain('IFEval')
    expect(labels).toContain('RULER')
    expect(labels).not.toContain('평가')
  })

  it('should include non-benchmark columns', () => {
    const keys = COLUMNS.map((c) => c.key)
    expect(keys).toContain('type')
    expect(keys).toContain('context')
  })

  it('should have correct total number of columns', () => {
    // type + 11 benchmarks (mmlu, gpqa, swe_bench, aime, hle, mgsm, kmmlu, truthfulqa, bfcl, ifeval, ruler) + context = 13
    expect(COLUMNS.length).toBe(13)
  })
})
