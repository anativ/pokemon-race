/**
 * Pre-race start-light rig (kind:'overlay', screens:['race']).
 *
 * A gantry-hung traffic-light panel (5 columns x 2 bulbs) fills red as the
 * countdown runs, then flips fully green on GO!, with the reference's
 * "3... 2... 1... GO!" strip underneath - the live step is the bright one.
 *
 * The sim owns control gating (phase 'countdown' keeps every kart at speed 0);
 * this module only ever reads state, so determinism is untouched.
 */

const COLS = 5;
const GO_HOLD = 1.7;    // seconds the GO! panel stays up after the lights go green

export default {
  id: 'pkr-race-countdown',
  kind: 'overlay',
  screens: ['race'],
  priority: 5,
  refs: null,

  mount(ctx) {
    ctx.layer.innerHTML = `
      <div class="pkr-countdown" data-countdown hidden>
        <div class="cd-rig">
          <span class="cd-hanger left"></span>
          <span class="cd-hanger right"></span>
          <div class="cd-panel">
            <div class="cd-lights">
              ${Array.from({ length: COLS }, (_, i) => `
                <span class="cd-col" data-col="${i}">
                  <i class="cd-bulb"></i>
                  <i class="cd-bulb"></i>
                </span>`).join('')}
            </div>
          </div>
        </div>
        <div class="cd-strip" data-strip>
          <span class="cd-tok" data-tok="3">3</span><span class="cd-dots">&hellip;</span>
          <span class="cd-tok" data-tok="2">2</span><span class="cd-dots">&hellip;</span>
          <span class="cd-tok" data-tok="1">1</span><span class="cd-dots">&hellip;</span>
          <span class="cd-tok cd-go" data-tok="GO">GO!</span>
        </div>
      </div>`;
    const q = (s) => ctx.layer.querySelector(s);
    this.refs = {
      root: q('[data-countdown]'),
      cols: [...ctx.layer.querySelectorAll('.cd-col')],
      toks: [...ctx.layer.querySelectorAll('.cd-tok')],
      total: 0,
    };
    this.lastStep = null;
    this.render(ctx);
  },

  render(ctx) {
    const r = this.refs;
    const race = ctx.state.race;
    if (!r || !race) return;

    if (race.phase === 'countdown') r.total = Math.max(r.total, race.countdown);
    const total = r.total || 2.4;

    const counting = race.phase === 'countdown';
    const justWent = race.phase === 'racing' && race.elapsed < GO_HOLD;
    const show = counting || justWent;
    if (r.root.hidden === show) r.root.hidden = !show;
    if (!show) { this.lastStep = null; return; }

    // step: 3 -> 2 -> 1 -> GO
    let step;
    let lit;
    if (counting) {
      const left = Math.max(0, race.countdown);
      step = String(Math.max(1, Math.min(3, Math.ceil((left / total) * 3 - 1e-4))));
      const p = 1 - left / total;                       // 0 .. 1
      lit = Math.max(1, Math.min(COLS, Math.ceil((p + 0.001) * COLS)));
    } else {
      step = 'GO';
      lit = COLS;
    }

    if (step !== this.lastStep) {
      this.lastStep = step;
      const green = step === 'GO';
      r.root.dataset.count = step;
      r.root.classList.toggle('go', green);
      for (const t of r.toks) t.classList.toggle('on', t.dataset.tok === step);
      // restart the pop animation on the active token
      const active = r.toks.find((t) => t.dataset.tok === step);
      if (active) { active.style.animation = 'none'; void active.offsetWidth; active.style.animation = ''; }
    }
    r.cols.forEach((c, i) => {
      const on = i < lit;
      c.classList.toggle('lit', on);
      c.classList.toggle('green', on && step === 'GO');
    });
    // fade the whole rig out over the tail of the GO hold
    if (justWent) {
      const k = Math.max(0, 1 - Math.max(0, race.elapsed - GO_HOLD * 0.45) / (GO_HOLD * 0.55));
      r.root.style.opacity = k.toFixed(3);
    } else {
      r.root.style.opacity = '1';
    }
  },

  unmount(ctx) {
    this.refs = null;
    if (ctx && ctx.layer) ctx.layer.innerHTML = '';
  },
};
