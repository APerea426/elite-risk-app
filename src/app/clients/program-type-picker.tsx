'use client';

export type BaseType = 'captive' | 'ov' | 'fronted';
export type PickerCarrier = 'ottawa' | 'victoria';
export type ProgramType = 'captive_only' | 'ottawa_victoria_captive' | 'ottawa_victoria_only' | 'fronted' | 'fronted_captive';

export function computeProgramType(
  base: BaseType,
  carrier: PickerCarrier,
  addCaptive: boolean
): { program_type: ProgramType; carrier: 'ottawa' | 'victoria' | 'none' } {
  if (base === 'captive') return { program_type: 'captive_only', carrier: 'none' };
  if (base === 'ov') return { program_type: addCaptive ? 'ottawa_victoria_captive' : 'ottawa_victoria_only', carrier };
  return { program_type: addCaptive ? 'fronted_captive' : 'fronted', carrier };
}

export function parseProgramType(
  program_type: string,
  carrier: string
): { base: BaseType; pickerCarrier: PickerCarrier; addCaptive: boolean } {
  if (program_type === 'captive_only') return { base: 'captive', pickerCarrier: 'ottawa', addCaptive: false };
  const base: BaseType = program_type.startsWith('ottawa') ? 'ov' : 'fronted';
  const addCaptive = program_type === 'ottawa_victoria_captive' || program_type === 'fronted_captive';
  const pickerCarrier: PickerCarrier = carrier === 'victoria' ? 'victoria' : 'ottawa';
  return { base, pickerCarrier, addCaptive };
}

interface Props {
  base: BaseType;
  carrier: PickerCarrier;
  addCaptive: boolean;
  onChange: (base: BaseType, carrier: PickerCarrier, addCaptive: boolean) => void;
}

export default function ProgramTypePicker({ base, carrier, addCaptive, onChange }: Props) {
  const btn = (active: boolean) =>
    `px-4 py-2 text-sm rounded-lg border transition-colors ${
      active
        ? 'bg-indigo-700 text-white border-indigo-700'
        : 'border-slate-300 text-slate-700 hover:border-indigo-400'
    }`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Program Structure <span className="text-red-500">*</span></p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => onChange('captive', carrier, false)} className={btn(base === 'captive')}>
            Captive Only
          </button>
          <button type="button" onClick={() => onChange('ov', carrier, addCaptive)} className={btn(base === 'ov')}>
            Ottawa / Victoria
          </button>
          <button type="button" onClick={() => onChange('fronted', carrier, addCaptive)} className={btn(base === 'fronted')}>
            Fronted Program
          </button>
        </div>
      </div>

      {(base === 'ov' || base === 'fronted') && (
        <>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Carrier</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => onChange(base, 'ottawa', addCaptive)} className={btn(carrier === 'ottawa')}>
                Ottawa
              </button>
              <button type="button" onClick={() => onChange(base, 'victoria', addCaptive)} className={btn(carrier === 'victoria')}>
                Victoria
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Include Captive Component?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => onChange(base, carrier, true)} className={btn(addCaptive)}>
                Yes
              </button>
              <button type="button" onClick={() => onChange(base, carrier, false)} className={btn(!addCaptive)}>
                No
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
