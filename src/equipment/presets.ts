// These are reference specifications, not an inferred full stack label list.
export const equipmentReferences = [
  {
    id: 'matrix-g7-s13',
    manufacturer: 'Matrix',
    model: 'Ultra G7-S13-AS2007',
    variant: '108 kg stack',
    increment: 4.5,
    maximum: 111.4,
    source:
      'https://images-direct.jhtassets.com/574a7216d03263864ea3d3263ef8bb93ef9a3710/original/named/UltraConvergingChestPress%2BIntelligentTrainingItc20%2B66304%2B85967%2Beng%2Bcz%2BProductSellSheetlargeprint.pdf',
    note: 'Main plates: 4.5 kg. Add-on settings: 1.1, 2.3 and 3.4 kg. Enter the available labels on your installed stack below.',
  },
  {
    id: 'life-insignia-ss-cp',
    manufacturer: 'Life Fitness',
    model: 'Insignia SS-CP',
    variant: 'Stack variant must be checked',
    increment: null,
    maximum: null,
    source:
      'https://support.lifefitness.com/hc/en-us/articles/4421250882327-Life-Fitness-Insignia-Strength-Customization-Options',
    note: 'Multiple stack options exist. Dial increments do not establish the complete main stack sequence. Enter your installed stack labels below.',
  },
] as const
export type MachineType =
  'chest' | 'shoulder' | 'lat' | 'row' | 'extension' | 'curl'
export function machineType(name: string): MachineType | null {
  const value = name.toLowerCase()
  if (value.includes('chest press')) return 'chest'
  if (value.includes('shoulder press') && value.includes('machine'))
    return 'shoulder'
  if (value.includes('lat pulldown')) return 'lat'
  if (
    value.includes('row') &&
    (value.includes('machine') ||
      value.includes('plate') ||
      value.includes('cable'))
  )
    return 'row'
  if (value.includes('leg extension')) return 'extension'
  if (value.includes('seated leg curl')) return 'curl'
  return null
}
