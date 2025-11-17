type PreferenceTogglesProps = {
  social: boolean;
  setSocial: (value: boolean) => void;
  proof: boolean;
  setProof: (value: boolean) => void;
};

export function PreferenceToggles({ social, setSocial, proof, setProof }: PreferenceTogglesProps) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 text-white/80">
      <div className="flex items-center justify-between">
        <span>Prefer social proof</span>
        <button
          type="button"
          onClick={() => setProof(!proof)}
          className={`h-8 w-14 rounded-full border px-1 transition ${proof ? 'border-white bg-white' : 'border-white/20 bg-white/10'}`}
        >
          <div className={`h-6 w-6 rounded-full bg-black transition ${proof ? 'translate-x-6' : ''}`} />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span>Solo-friendly</span>
        <button
          type="button"
          onClick={() => setSocial(!social)}
          className={`h-8 w-14 rounded-full border px-1 transition ${social ? 'border-white bg-white' : 'border-white/20 bg-white/10'}`}
        >
          <div className={`h-6 w-6 rounded-full bg-black transition ${social ? 'translate-x-6' : ''}`} />
        </button>
      </div>
    </div>
  );
}
