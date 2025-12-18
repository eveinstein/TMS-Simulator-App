/**
 * Vascular Surgery Op-Note Template Library v1.0
 * 
 * This library provides templates for generating draft operative reports
 * from selected CPT codes. All templates use *** placeholders for
 * specifics that must be filled in by the surgeon.
 * 
 * DISCLAIMER: Generated notes are drafts only and must be edited
 * to reflect the actual procedure, medical necessity, and documentation requirements.
 */

import type { CodeEntry, PatientContext, GeneratedNote } from '@/types';

// ============================================
// CONSTANTS
// ============================================

export const DISCLAIMER = `DISCLAIMER: This draft is a suggestion only and must be edited to reflect the actual case, medical necessity, and documentation requirements. It is not a billable note on its own.`;

export const NARRATIVE_ORDER = {
  OPENING: 1,
  ACCESS: 2,
  CATHETER: 3,
  PRIMARY: 4,
  ADDON: 5,
  CLOSURE: 6,
};

// ============================================
// OPENING BLOCK TEMPLATES
// ============================================

export const OPENING_TEMPLATES: Record<string, (ctx: PatientContext) => string> = {
  groin: (ctx) => `The patient was brought to the operating room and placed supine on the operating table. After induction of ${ctx.anesthesiaType || '*** anesthesia'}, the ${ctx.laterality || '***'} groin was prepped and draped in the usual sterile fashion.`,
  
  bilateral_groin: (ctx) => `The patient was brought to the operating room and placed supine on the operating table. After induction of ${ctx.anesthesiaType || '*** anesthesia'}, both groins were prepped and draped in the usual sterile fashion.`,
  
  neck: (ctx) => `The patient was brought to the operating room and placed supine on the operating table with the head turned to the ${ctx.laterality === 'left' ? 'right' : ctx.laterality === 'right' ? 'left' : '***'} side. After induction of ${ctx.anesthesiaType || '*** anesthesia'}, the ${ctx.laterality || '***'} neck was prepped and draped in the usual sterile fashion.`,
  
  arm: (ctx) => `The patient was brought to the operating room and placed supine on the operating table with the ${ctx.laterality || '***'} arm extended on an arm board. After induction of ${ctx.anesthesiaType || '*** anesthesia'}, the ${ctx.laterality || '***'} upper extremity was prepped and draped in the usual sterile fashion.`,
  
  fistula_site: (ctx) => `The patient was brought to the procedure room and placed supine on the table with the ${ctx.laterality || '***'} arm extended. After administration of ${ctx.anesthesiaType || '*** sedation/local anesthesia'}, the ${ctx.laterality || '***'} upper extremity and fistula/graft site were prepped and draped in the usual sterile fashion.`,
  
  abdomen: (ctx) => `The patient was brought to the operating room and placed supine on the operating table. After induction of ${ctx.anesthesiaType || 'general anesthesia'}, the abdomen was prepped and draped in the usual sterile fashion from nipples to thighs, including bilateral groins.`,
  
  leg: (ctx) => `The patient was brought to the operating room and placed supine on the operating table. After induction of ${ctx.anesthesiaType || '*** anesthesia'}, the ${ctx.laterality || '***'} lower extremity was circumferentially prepped and draped in the usual sterile fashion.`,
  
  operative_limb: (ctx) => `The patient was brought to the operating room and placed supine on the operating table. After induction of ${ctx.anesthesiaType || '*** anesthesia'}, the ${ctx.laterality || '***'} lower extremity was circumferentially prepped and draped in the usual sterile fashion. The planned level of amputation was marked.`,
  
  operative_site: (ctx) => `The patient was brought to the operating room and placed supine on the operating table. After induction of ${ctx.anesthesiaType || '*** anesthesia'}, the operative site(s) were prepped and draped in the usual sterile fashion.`,
  
  neck_or_groin: (ctx) => `The patient was brought to the procedure room and placed supine on the table. After administration of ${ctx.anesthesiaType || '*** sedation/local anesthesia'}, the ${ctx.accessSite || '*** (neck/groin)'} was prepped and draped in the usual sterile fashion.`,
  
  default: (ctx) => `The patient was brought to the operating room and placed in the appropriate position on the operating table. After induction of ${ctx.anesthesiaType || '*** anesthesia'}, the operative site was prepped and draped in the usual sterile fashion.`,
};

// ============================================
// CLOSING BLOCK TEMPLATE
// ============================================

export const CLOSING_TEMPLATE = (_ctx: PatientContext): string => {
  return `Hemostasis was achieved at the access/operative site(s). All counts were correct. The patient tolerated the procedure well and was transferred to *** in stable condition.`;
};

// ============================================
// ACCESS & GUIDANCE TEMPLATES
// ============================================

export const ACCESS_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  ACCESS_US_GUIDANCE: (ctx, _code) => `Ultrasound guidance was used for vascular access. The target vessel was evaluated for patency and compressibility, and the access site was assessed for suitability. A permanent image was saved to the medical record. Access was obtained in the ${ctx.accessSite || '*** vessel'} under real-time ultrasound guidance using a micropuncture technique.`,
};

// ============================================
// CATHETER PLACEMENT TEMPLATES
// ============================================

export const CATHETER_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  SELECTIVE_CATH: (_ctx, code) => {
    const orderText = code.code === '36245' ? 'first order' :
                      code.code === '36246' ? 'second order' :
                      code.code === '36247' ? 'third order' :
                      code.code === '36248' ? 'additional branch' : 'selective';
    return `A catheter and guidewire were advanced under fluoroscopic guidance. ${orderText.charAt(0).toUpperCase() + orderText.slice(1)} selective catheterization was performed to the ${code.vascular_territory || '*** vessel/territory'}.`;
  },
};

// ============================================
// IMAGING ADD-ON TEMPLATES
// ============================================

export const IMAGING_ADDON_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  IVUS: (_ctx, code) => {
    if (code.code === '37252') {
      return `Intravascular ultrasound (IVUS) was performed in the *** vessel to assess vessel diameter, lesion morphology, and plaque characteristics. The vessel diameter measured *** mm. Findings were recorded.`;
    } else {
      return `IVUS was also performed in an additional vessel (***) with diameter measuring *** mm.`;
    }
  },
  
  IVL_ADDON: (_ctx, _code) => `Intravascular lithotripsy (IVL) was performed for treatment of heavily calcified lesion(s). The IVL catheter was positioned across the calcified segment and *** cycles of therapy were delivered. Post-IVL imaging demonstrated improved vessel compliance.`,
};

// ============================================
// DIALYSIS ACCESS TEMPLATES
// ============================================

export const DIALYSIS_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  DIALYSIS_FISTULOGRAM: (ctx, code) => {
    let base = `Access was obtained into the dialysis circuit. A complete fistulogram/graftogram was performed with imaging from the arterial anastomosis through the central veins to document the entire circuit.`;
    
    if (code.code === '36902') {
      base += `\n\nA *** stenosis was identified at the *** segment. Balloon angioplasty was performed using a *** mm x *** cm balloon inflated to *** atmospheres. Post-angioplasty imaging demonstrated ***.`;
    } else if (code.code === '36903') {
      base += `\n\nA *** stenosis was identified at the *** segment. After angioplasty, a *** mm x *** cm stent was deployed. Post-stent imaging demonstrated ***.`;
    }
    
    return base;
  },
  
  DIALYSIS_DECLOT: (ctx, code) => {
    let base = `The thrombosed dialysis circuit was accessed. Mechanical thrombectomy was performed using *** technique/device. Thrombus was successfully evacuated with restoration of flow through the circuit.`;
    
    if (code.code === '36905') {
      base += `\n\nA *** stenosis was identified at the *** segment (peripheral). Balloon angioplasty was performed using a *** mm balloon. Post-angioplasty imaging demonstrated ***.`;
    } else if (code.code === '36906') {
      base += `\n\nA *** stenosis was identified at the *** segment (peripheral). After angioplasty, a *** mm x *** cm stent was deployed. Post-stent imaging demonstrated ***.`;
    }
    
    if (code.code === '36907') {
      base = `Central venous stenosis was identified at the *** (subclavian/brachiocephalic/SVC). Balloon angioplasty of the central segment was performed using a *** mm balloon with good result.`;
    } else if (code.code === '36908') {
      base = `Central venous stenosis was identified at the *** (subclavian/brachiocephalic/SVC). A *** mm x *** cm stent was deployed in the central segment. Post-stent imaging demonstrated ***.`;
    } else if (code.code === '36909') {
      base = `Accessory/collateral vein(s) were identified causing steal or inadequate maturation. Embolization was performed using *** (coils/plug/sclerosant). Post-embolization imaging confirmed occlusion of the targeted vessel(s).`;
    }
    
    return base;
  },
  
  DIALYSIS_SURGICAL: (ctx, code) => {
    // AVF/AVG creation codes
    if (code.code === '36821') {
      return `An incision was made over the ${ctx.laterality || '***'} *** (wrist/forearm/antecubital fossa). The *** artery and *** vein were identified and mobilized. An end-to-side arteriovenous anastomosis was created using *** suture. A palpable thrill and audible bruit were confirmed. The wound was closed in layers.`;
    } else if (code.code === '36818' || code.code === '36819' || code.code === '36820') {
      return `An incision was made over the ${ctx.laterality || '***'} *** (forearm/upper arm). The *** vein was identified, mobilized, and transposed to a superficial position. The *** artery was exposed. An end-to-side arteriovenous anastomosis was created using *** suture. A palpable thrill and audible bruit were confirmed. The wound was closed in layers.`;
    } else if (code.code === '36830') {
      return `Incisions were made over the ${ctx.laterality || '***'} *** for arterial inflow and venous outflow. A *** mm PTFE graft was tunneled in a *** (loop/straight) configuration. The arterial anastomosis was created to the *** artery and venous anastomosis to the *** vein using *** suture. A palpable thrill was confirmed. Wounds were closed in layers.`;
    } else if (code.code === '36831') {
      return `The ${ctx.laterality || '***'} dialysis access was explored through the previous incision. The thrombus was evacuated using *** technique. Inflow and outflow were confirmed. The wound was closed.`;
    } else if (code.code === '36832' || code.code === '36833') {
      let base = `The ${ctx.laterality || '***'} dialysis access was explored through the previous incision.`;
      if (code.code === '36833') {
        base += ` Thrombus was evacuated using *** technique.`;
      }
      base += ` The stenotic/diseased segment at *** was identified. Revision was performed using *** (patch angioplasty/interposition graft/jump graft). Good flow was restored. The wound was closed.`;
      return base;
    }
    
    return `The dialysis access procedure was performed as planned. *** (procedure-specific details).`;
  },
};

// ============================================
// ENDOVASCULAR LER TEMPLATES
// ============================================

export const ENDO_LER_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  ILIAC_ENDO: (ctx, code) => {
    const territory = 'iliac artery';
    const pathology = code.pathology_type === 'occlusion' ? 'chronic total occlusion' : 
                      code.pathology_type === 'stenosis' ? 'stenotic lesion' : '*** lesion';
    
    let base = `Attention was turned to the ${ctx.laterality || '***'} ${territory}. Angiography demonstrated a ${pathology} of the *** iliac artery.`;
    
    if (code.intervention_subtype === 'angioplasty') {
      base += ` The lesion was crossed with a guidewire. Angioplasty was performed using a *** mm x *** cm balloon. Completion angiography demonstrated ***.`;
    } else if (code.intervention_subtype === 'stent') {
      base += ` The lesion was crossed with a guidewire. Pre-dilation was performed as needed. A *** mm x *** cm stent was deployed and post-dilated. Completion angiography demonstrated ***.`;
    }
    
    if (code.is_addon) {
      base = `An additional ${territory} lesion was treated. *** (angioplasty/stent) was performed with good result.`;
    }
    
    return base;
  },
  
  FEMPOP_ENDO: (ctx, code) => {
    const territory = 'femoral-popliteal segment';
    const pathology = code.pathology_type === 'occlusion' ? 'chronic total occlusion' : 
                      code.pathology_type === 'stenosis' ? 'stenotic lesion' : '*** lesion';
    
    let base = `Attention was turned to the ${ctx.laterality || '***'} ${territory}. Angiography demonstrated a ${pathology} of the *** (SFA/popliteal artery) measuring approximately *** cm in length.`;
    
    if (code.intervention_subtype === 'angioplasty') {
      base += ` The lesion was crossed with a guidewire${code.pathology_type === 'occlusion' ? ' using *** technique (intraluminal/subintimal)' : ''}. Angioplasty was performed using a *** mm x *** cm balloon. Completion angiography demonstrated ***.`;
    } else if (code.intervention_subtype === 'stent') {
      base += ` The lesion was crossed with a guidewire. Pre-dilation was performed. A *** mm x *** cm stent was deployed across the lesion and post-dilated as needed. Completion angiography demonstrated ***.`;
    } else if (code.intervention_subtype === 'atherectomy') {
      base += ` The lesion was crossed with a guidewire. Atherectomy was performed using *** device. Adjunctive angioplasty was performed using a *** mm balloon. Completion angiography demonstrated ***.`;
    } else if (code.intervention_subtype === 'stent_atherectomy') {
      base += ` The lesion was crossed with a guidewire. Atherectomy was performed using *** device. Adjunctive angioplasty was performed. A *** mm x *** cm stent was then deployed and post-dilated. Completion angiography demonstrated ***.`;
    }
    
    if (code.is_addon) {
      base = `An additional femoral-popliteal lesion was treated. *** intervention was performed with good result.`;
    }
    
    return base;
  },
  
  TIBIAL_ENDO: (ctx, code) => {
    const pathology = code.pathology_type === 'occlusion' ? 'chronic total occlusion' : 
                      code.pathology_type === 'stenosis' ? 'stenotic lesion' : '*** lesion';
    
    let base = `Attention was turned to the ${ctx.laterality || '***'} tibial vessels. Angiography demonstrated a ${pathology} of the *** (anterior tibial/posterior tibial/peroneal artery).`;
    
    if (code.intervention_subtype === 'angioplasty') {
      base += ` The lesion was crossed with a guidewire. Angioplasty was performed using a *** mm x *** cm balloon. Completion angiography demonstrated ***.`;
    } else if (code.intervention_subtype === 'stent') {
      base += ` The lesion was crossed with a guidewire. Pre-dilation was performed. A *** mm x *** cm stent was deployed. Completion angiography demonstrated ***.`;
    } else if (code.intervention_subtype === 'atherectomy') {
      base += ` The lesion was crossed with a guidewire. Atherectomy was performed using *** device. Adjunctive angioplasty was performed. Completion angiography demonstrated ***.`;
    } else if (code.intervention_subtype === 'stent_atherectomy') {
      base += ` The lesion was crossed with a guidewire. Atherectomy was performed using *** device. A *** mm x *** cm stent was then deployed. Completion angiography demonstrated ***.`;
    }
    
    if (code.is_addon) {
      base = `An additional tibial vessel (***) was treated. *** intervention was performed with good result.`;
    }
    
    return base;
  },
  
  PEDAL_ENDO: (ctx, code) => {
    const pathology = code.pathology_type === 'occlusion' ? 'chronic total occlusion' : 
                      code.pathology_type === 'stenosis' ? 'stenotic lesion' : '*** lesion';
    
    let base = `Attention was turned to the ${ctx.laterality || '***'} pedal/inframalleolar vessels. Angiography demonstrated a ${pathology} of the *** (dorsalis pedis/plantar artery).`;
    
    base += ` The lesion was carefully crossed with a guidewire. Angioplasty was performed using a *** mm x *** cm balloon. Completion angiography demonstrated ***.`;
    
    if (code.is_addon) {
      base = `An additional pedal vessel (***) was treated. Angioplasty was performed with good result.`;
    }
    
    return base;
  },
};

// ============================================
// AORTIC ENDOVASCULAR TEMPLATES
// ============================================

export const AORTIC_ENDO_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  EVAR: (ctx, code) => {
    const isRuptured = code.shorthand.toLowerCase().includes('ruptured');
    const configType = code.shorthand.toLowerCase().includes('tube') ? 'tube' :
                       code.shorthand.toLowerCase().includes('uni-iliac') ? 'aorto-uni-iliac' : 'bifurcated';
    
    let base = isRuptured ? 
      `Given the emergent nature of the ruptured abdominal aortic aneurysm, rapid access was obtained.` :
      `Bilateral femoral access was obtained.`;
    
    base += ` Aortography was performed demonstrating the infrarenal abdominal aortic aneurysm with neck and iliac anatomy as anticipated from preoperative imaging.`;
    
    if (configType === 'tube') {
      base += ` A *** mm x *** cm aortic tube endograft was deployed from the infrarenal neck to the aortic bifurcation with adequate seal zones.`;
    } else if (configType === 'aorto-uni-iliac') {
      base += ` A *** mm x *** cm aorto-uni-iliac device was deployed. A *** mm occluder was placed in the contralateral iliac artery. A fem-fem bypass was performed.`;
    } else {
      base += ` The main body of a *** mm x *** cm bifurcated endograft was deployed from the infrarenal neck. The ipsilateral iliac limb was deployed. The contralateral limb was then cannulated and deployed.`;
    }
    
    base += ` Completion angiography demonstrated ***. There was no evidence of endoleak type ***.`;
    
    return base;
  },
  
  TEVAR: (ctx, code) => {
    const coversLSA = code.shorthand.toLowerCase().includes('covers lsa');
    const hasFenestration = code.code === '33882';
    
    let base = `Femoral access was obtained. A marker pigtail catheter was positioned for imaging. Aortography was performed confirming the thoracic aortic pathology and planned landing zones.`;
    
    if (hasFenestration) {
      base += ` A fenestrated thoracic endograft was positioned with the fenestration aligned with the left subclavian artery origin. A *** mm x *** cm branch stent was deployed through the fenestration into the left subclavian artery.`;
    } else if (coversLSA) {
      base += ` The thoracic endograft (*** mm x *** cm) was deployed with planned coverage of the left subclavian artery origin. [If revascularization performed, document. If not: Left subclavian artery coverage was accepted given ***.]`;
    } else {
      base += ` The thoracic endograft (*** mm x *** cm) was deployed with the proximal landing zone distal to the left subclavian artery origin.`;
    }
    
    base += ` Completion angiography demonstrated good position with no endoleak.`;
    
    if (code.code === '33883' || code.code === '33886') {
      base = `A proximal/distal extension component (*** mm x *** cm) was deployed to extend the thoracic repair. Completion angiography demonstrated good seal with no endoleak.`;
    }
    
    return base;
  },
  
  FEVAR: (ctx, code) => {
    const vesselCount = code.shorthand.match(/(\d+)/)?.[1] || '***';
    
    let base = `Bilateral femoral access and left brachial access were obtained. Aortography was performed confirming the extent of the aneurysm and visceral vessel anatomy.`;
    
    base += ` A fenestrated/branched endograft was positioned. The target visceral vessels (${vesselCount}) were sequentially cannulated and stented: ***. Each branch was confirmed patent with selective angiography.`;
    
    base += ` The bifurcated component and iliac limbs were deployed. Completion angiography demonstrated good position with no endoleak and patent visceral branches.`;
    
    return base;
  },
};

// ============================================
// CAROTID TEMPLATES
// ============================================

export const CAROTID_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  CEA: (ctx, code) => {
    const isRedo = code.code === '35390';
    
    let base = `An incision was made along the anterior border of the sternocleidomastoid muscle.`;
    
    if (isRedo) {
      base += ` Given the previous surgery, careful dissection was performed through scar tissue.`;
    }
    
    base += ` The common carotid, internal carotid, and external carotid arteries were exposed and controlled. The patient was systemically heparinized.`;
    
    base += ` After confirming adequate cerebral perfusion with ***, the arteries were clamped. An arteriotomy was made and a *** shunt was (placed/not required). The plaque was carefully dissected from the arterial wall using standard endarterectomy technique. The endpoint was secured with tacking sutures as needed.`;
    
    base += ` The arteriotomy was closed with a *** patch (bovine pericardium/Dacron/primary). Flow was restored. Hemostasis was achieved. A *** drain was (placed/not placed). The wound was closed in layers.`;
    
    return base;
  },
  
  CAROTID_STENT: (ctx, code) => {
    const isTCAR = code.code === '37217';
    const hasEPD = code.code === '37215';
    
    let base = '';
    
    if (isTCAR) {
      base = `A transverse incision was made in the ${ctx.laterality || '***'} neck above the clavicle. The common carotid artery was exposed. A TCAR arterial sheath was placed directly into the CCA. Flow reversal was established using the *** system with venous return to the femoral vein.`;
      base += ` Angiography demonstrated the target lesion. The lesion was crossed and pre-dilated. A *** mm x *** cm carotid stent was deployed across the lesion. Post-dilation was performed. Flow reversal was discontinued. Completion angiography demonstrated ***.`;
      base += ` The arteriotomy was closed with ***. The wound was closed in layers.`;
    } else {
      base = `Femoral access was obtained. Diagnostic arch and cerebrovascular angiography was performed. The ${ctx.laterality || '***'} carotid artery demonstrated *** stenosis at the bulb/proximal ICA.`;
      
      if (hasEPD) {
        base += ` An embolic protection device (***) was deployed in the distal internal carotid artery.`;
      }
      
      base += ` The lesion was crossed with a guidewire. Pre-dilation was performed. A *** mm x *** cm carotid stent was deployed. Post-dilation was performed.`;
      
      if (hasEPD) {
        base += ` The embolic protection device was retrieved.`;
      }
      
      base += ` Completion angiography demonstrated ***.`;
    }
    
    return base;
  },
};

// ============================================
// OPEN VASCULAR TEMPLATES
// ============================================

export const OPEN_VASCULAR_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  OPEN_AAA: (ctx, code) => {
    const isRuptured = code.shorthand.toLowerCase().includes('ruptured');
    const isTAAA = code.code === '35102';
    
    let base = '';
    
    if (isRuptured) {
      base = `Given the emergent presentation, rapid midline laparotomy was performed. Supraceliac aortic control was obtained. `;
    } else {
      base = `A midline laparotomy was performed. The retroperitoneum was entered and the abdominal aorta was exposed from below the renal arteries to the bifurcation. `;
    }
    
    if (isTAAA) {
      base = `A thoracoabdominal incision was made. The thoracic and abdominal aorta were exposed. `;
      base += `Sequential clamping was performed with visceral and renal perfusion maintained via ***. The aneurysm was opened and a *** mm tube/bifurcated graft was sewn in place. Visceral vessels were reimplanted as *** (inclusion buttons/bypass grafts). `;
    } else {
      base += `The patient was heparinized. Proximal and distal control was obtained. The aorta was clamped and the aneurysm sac was opened. A *** mm *** (tube/bifurcated) graft was sewn proximally and distally with *** suture. `;
    }
    
    base += `The aneurysm sac was closed over the graft. Hemostasis was confirmed. The abdomen was closed in layers.`;
    
    return base;
  },
  
  BYPASS: (ctx, code) => {
    // Determine bypass type from code
    const bypassTypes: Record<string, string> = {
      '35621': 'axillary-femoral',
      '35646': 'aorto-bifemoral',
      '35656': 'femoral-popliteal',
      '35661': 'femoral-femoral',
      '35601': 'carotid-carotid',
      '35606': 'carotid-subclavian',
    };
    
    const bypassType = bypassTypes[code.code] || '***';
    
    let base = `Incisions were made to expose the inflow and outflow vessels for the planned ${bypassType} bypass. `;
    
    if (code.code === '35646') {
      base += `A midline laparotomy was performed. The infrarenal aorta was exposed. Bilateral femoral arteries were exposed through groin incisions. The patient was heparinized. A *** mm bifurcated graft was tunneled to both groins. The proximal anastomosis was created to the aorta and distal anastomoses to the femoral arteries using *** suture. `;
    } else if (code.code === '35656') {
      base += `The ${ctx.laterality || '***'} common femoral artery and *** popliteal artery (above/below knee) were exposed. The patient was heparinized. A *** (vein/PTFE) graft was tunneled anatomically. Proximal and distal anastomoses were created using *** suture. `;
    } else if (code.code === '35661') {
      base += `Bilateral femoral arteries were exposed through groin incisions. The patient was heparinized. A *** mm PTFE graft was tunneled subcutaneously in a suprapubic fashion. Anastomoses were created to both femoral arteries. `;
    } else if (code.code === '35621') {
      base += `The ${ctx.laterality || '***'} axillary artery and femoral artery were exposed. The patient was heparinized. A *** mm graft was tunneled subcutaneously along the chest wall. Proximal anastomosis to the axillary artery and distal anastomosis to the femoral artery were created. `;
    } else {
      base += `The inflow vessel (***) and outflow vessel (***) were exposed. The patient was heparinized. A *** conduit was used to create the bypass. Proximal and distal anastomoses were created using *** suture. `;
    }
    
    base += `Flow was restored and confirmed with *** (palpation/Doppler/completion angiography). Wounds were closed in layers.`;
    
    return base;
  },
  
  THROMBECTOMY_OPEN: (ctx, _code) => {
    return `An incision was made over the ${ctx.laterality || '***'} femoral artery. The common, superficial, and profunda femoral arteries were exposed and controlled. The patient was heparinized. An arteriotomy was made. Fogarty embolectomy catheters were passed proximally and distally with extraction of thrombus/embolus. Inflow and backbleeding were confirmed. Completion assessment was performed with *** (Doppler/angiography). The arteriotomy was closed with *** (primary/patch). Flow was restored. The wound was closed in layers.`;
  },
};

// ============================================
// VENOUS TEMPLATES
// ============================================

export const VENOUS_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  VENOUS_ABLATION: (ctx, code) => {
    const isRFA = code.code === '36475' || code.code === '36476';
    const isLaser = code.code === '36478' || code.code === '36479';
    const isMOCA = code.code === '36473' || code.code === '36474';
    
    const modality = isRFA ? 'radiofrequency ablation' : 
                   isLaser ? 'laser ablation' :
                   isMOCA ? 'mechanochemical ablation' : 'endovenous ablation';
    
    let base = `The ${ctx.laterality || '***'} *** (great saphenous/small saphenous) vein was accessed under ultrasound guidance at the *** level. A *** catheter was advanced and positioned *** cm from the saphenofemoral/saphenopopliteal junction.`;
    
    base += ` Tumescent anesthesia was administered along the course of the vein under ultrasound guidance. ${modality.charAt(0).toUpperCase() + modality.slice(1)} was performed along *** cm of the vein. `;
    
    if (isRFA) {
      base += `*** cycles of RF energy were delivered.`;
    } else if (isLaser) {
      base += `*** joules were delivered per centimeter.`;
    } else if (isMOCA) {
      base += `The catheter was withdrawn while simultaneously delivering mechanical disruption and sclerosant (***).`;
    }
    
    base += ` Post-procedure ultrasound confirmed vein closure with no evidence of DVT.`;
    
    return base;
  },
  
  VENOUS_STENT: (ctx, _code) => {
    return `Venous access was obtained and venography performed demonstrating *** stenosis/compression of the ${ctx.laterality || '***'} iliac vein. IVUS confirmed significant luminal narrowing. The lesion was crossed and pre-dilated. A *** mm x *** cm venous stent was deployed. Post-dilation was performed. Completion venography and IVUS demonstrated good luminal gain with no residual stenosis.`;
  },
  
  IVC_FILTER: (ctx, code) => {
    if (code.code === '37191') {
      return `Venous access was obtained via the ${ctx.accessSite || '*** (jugular/femoral)'} approach. A cavogram was performed demonstrating the IVC anatomy, renal vein positions, and absence of IVC thrombus. A *** (filter type) IVC filter was deployed in the infrarenal IVC. Post-deployment imaging confirmed appropriate positioning.`;
    } else if (code.code === '37192') {
      return `Venous access was obtained. Cavography demonstrated a tilted/malpositioned IVC filter. Using *** technique, the filter was successfully repositioned to an appropriate infrarenal location. Post-procedure imaging confirmed appropriate positioning.`;
    } else {
      return `Venous access was obtained via the ${ctx.accessSite || '*** (jugular/femoral)'} approach. Cavography demonstrated the indwelling IVC filter. Using *** retrieval technique, the filter was successfully engaged and retrieved. Post-retrieval cavography demonstrated no IVC injury or residual thrombus.`;
    }
  },
  
  PHLEBECTOMY: (ctx, code) => {
    const incisionCount = code.code === '37765' ? '10-20' : '>20';
    return `Stab phlebectomy was performed for varicose veins of the ${ctx.laterality || '***'} lower extremity. ${incisionCount} stab incisions were made along the course of the marked varicose tributaries. The varicose vein segments were extracted using phlebectomy hooks. Hemostasis was achieved with compression. Incisions were closed with Steri-Strips/sutures.`;
  },
};

// ============================================
// AMPUTATION TEMPLATES
// ============================================

export const AMPUTATION_TEMPLATES: Record<string, (ctx: PatientContext, code: CodeEntry) => string> = {
  AMPUTATION: (ctx, code) => {
    if (code.code === '27590') {
      // AKA
      return `A circumferential incision was made at the planned level of the ${ctx.laterality || '***'} thigh. The anterior and posterior flaps were developed. The quadriceps and hamstring muscles were divided. The femoral vessels were identified, ligated, and divided. The sciatic nerve was identified, gently tracted, sharply divided, and allowed to retract. The femur was divided with an oscillating saw at the planned level. The wound was irrigated. Myoplasty/myodesis was performed to cover the bone end. The wound was closed in layers over a drain.`;
    } else if (code.code === '27880') {
      // BKA
      return `A long posterior flap incision was marked at the planned level of the ${ctx.laterality || '***'} leg. The skin and subcutaneous tissue were divided. The anterior compartment muscles were divided at the level of the planned bone cut. The tibia and fibula were divided with an oscillating saw, with the fibula cut *** cm shorter. The posterior vessels were identified, ligated, and divided. The tibial nerve was gently tracted, sharply divided, and allowed to retract. A generous posterior muscle flap was fashioned. The wound was irrigated and closed in layers over a drain.`;
    } else if (code.code === '28805') {
      // TMA
      return `A dorsal incision was made at the level of the metatarsal necks with a plantar flap incision on the ${ctx.laterality || '***'} foot. The metatarsals were divided with an oscillating saw at the planned level. The plantar flap was carefully developed to preserve blood supply. The wound was irrigated and closed with the plantar flap over a drain as indicated.`;
    } else if (code.code === '28820') {
      // Toe amp
      return `An incision was made at the base of the ${ctx.laterality || '***'} *** (toe number) toe / ray. The digit/ray was disarticulated at the metatarsophalangeal joint. The metatarsal head was *** (preserved/resected as indicated). The wound was irrigated and closed primarily / left open for healing by secondary intention.`;
    }
    
    return `The amputation was performed at the planned level of the ${ctx.laterality || '***'} extremity. Standard technique was used for soft tissue handling, vessel ligation, nerve management, and bone division. The wound was closed appropriately.`;
  },
};

// ============================================
// UNLISTED TEMPLATE
// ============================================

export const UNLISTED_TEMPLATE = (_ctx: PatientContext, _code: CodeEntry): string => {
  return `[UNLISTED PROCEDURE CODE: This code requires manual pricing and a detailed operative description. Please provide a complete narrative of the procedure performed, including:]

- Specific procedure name and description
- Indication and medical necessity
- Detailed technique
- Any devices/materials used
- Findings and outcomes

[Reference a comparable CPT code for pricing guidance if applicable.]`;
};

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

export function generateOpNote(
  selectedCodes: CodeEntry[],
  patientContext: PatientContext = {}
): GeneratedNote {
  
  // Sort codes by narrative order
  const sortedCodes = [...selectedCodes].sort((a, b) => {
    const orderA = a.narrative_order ?? 99;
    const orderB = b.narrative_order ?? 99;
    return orderA - orderB;
  });
  
  // Determine access site from primary procedure
  const primaryCode = sortedCodes.find(c => c.narrative_order === 4 && !c.is_addon);
  const accessSiteHint = primaryCode?.access_site_hint || 'default';
  const inferredContext: PatientContext = {
    ...patientContext,
    accessSite: patientContext.accessSite || accessSiteHint,
  };
  
  // Build operations performed list
  const operationsPerformed = sortedCodes
    .map(c => `- ${c.shorthand} (${c.code})`)
    .join('\n');
  
  // Build narrative sections
  const narrativeSections: string[] = [];
  
  // Opening block
  const openingTemplate = OPENING_TEMPLATES[accessSiteHint] || OPENING_TEMPLATES.default;
  narrativeSections.push(openingTemplate(inferredContext));
  
  // Process each code in order
  for (const code of sortedCodes) {
    const template = getTemplateForCode(code);
    if (template) {
      narrativeSections.push(template(inferredContext, code));
    }
  }
  
  // Closing block
  narrativeSections.push(CLOSING_TEMPLATE(inferredContext));
  
  // Assemble full note
  const header = `OPERATION REPORT

${DISCLAIMER}

DATE OF OPERATION: ***

PREOPERATIVE DIAGNOSIS:
***

POSTOPERATIVE DIAGNOSIS:
***

OPERATIONS PERFORMED:
${operationsPerformed}

SURGEON: ***
CO-SURGEON: ***
ASSISTANTS: ***
ANESTHESIA: ***
ESTIMATED BLOOD LOSS: ***cc

INDICATIONS FOR PROCEDURE:
***

`;

  const narrative = narrativeSections.join('\n\n');
  
  const fullNote = header + `OPERATIVE PROCEDURE:\n\n` + narrative;
  
  return {
    header,
    operationsPerformed,
    narrative,
    fullNote,
  };
}

// ============================================
// TEMPLATE SELECTOR HELPER
// ============================================

function getTemplateForCode(code: CodeEntry): ((ctx: PatientContext, code: CodeEntry) => string) | null {
  const templateType = code.template_type;
  
  if (!templateType) return null;
  
  // Skip E/M codes - they don't generate op notes
  if (templateType === 'EM_VISIT') return null;
  
  // Access & Guidance
  if (templateType === 'ACCESS_US_GUIDANCE') {
    return ACCESS_TEMPLATES.ACCESS_US_GUIDANCE;
  }
  
  // Catheter placement
  if (templateType === 'SELECTIVE_CATH') {
    return CATHETER_TEMPLATES.SELECTIVE_CATH;
  }
  
  // Imaging add-ons
  if (templateType === 'IVUS') {
    return IMAGING_ADDON_TEMPLATES.IVUS;
  }
  if (templateType === 'IVL_ADDON') {
    return IMAGING_ADDON_TEMPLATES.IVL_ADDON;
  }
  
  // Dialysis
  if (templateType === 'DIALYSIS_FISTULOGRAM') {
    return DIALYSIS_TEMPLATES.DIALYSIS_FISTULOGRAM;
  }
  if (templateType === 'DIALYSIS_DECLOT') {
    return DIALYSIS_TEMPLATES.DIALYSIS_DECLOT;
  }
  if (templateType === 'DIALYSIS_SURGICAL') {
    return DIALYSIS_TEMPLATES.DIALYSIS_SURGICAL;
  }
  
  // Endovascular LER
  if (templateType === 'ILIAC_ENDO') {
    return ENDO_LER_TEMPLATES.ILIAC_ENDO;
  }
  if (templateType === 'FEMPOP_ENDO') {
    return ENDO_LER_TEMPLATES.FEMPOP_ENDO;
  }
  if (templateType === 'TIBIAL_ENDO') {
    return ENDO_LER_TEMPLATES.TIBIAL_ENDO;
  }
  if (templateType === 'PEDAL_ENDO') {
    return ENDO_LER_TEMPLATES.PEDAL_ENDO;
  }
  
  // Aortic endo
  if (templateType === 'EVAR') {
    return AORTIC_ENDO_TEMPLATES.EVAR;
  }
  if (templateType === 'TEVAR') {
    return AORTIC_ENDO_TEMPLATES.TEVAR;
  }
  if (templateType === 'FEVAR') {
    return AORTIC_ENDO_TEMPLATES.FEVAR;
  }
  
  // Carotid
  if (templateType === 'CEA') {
    return CAROTID_TEMPLATES.CEA;
  }
  if (templateType === 'CAROTID_STENT') {
    return CAROTID_TEMPLATES.CAROTID_STENT;
  }
  
  // Open vascular
  if (templateType === 'OPEN_AAA') {
    return OPEN_VASCULAR_TEMPLATES.OPEN_AAA;
  }
  if (templateType === 'BYPASS') {
    return OPEN_VASCULAR_TEMPLATES.BYPASS;
  }
  if (templateType === 'THROMBECTOMY_OPEN') {
    return OPEN_VASCULAR_TEMPLATES.THROMBECTOMY_OPEN;
  }
  
  // Venous
  if (templateType === 'VENOUS_ABLATION') {
    return VENOUS_TEMPLATES.VENOUS_ABLATION;
  }
  if (templateType === 'VENOUS_STENT') {
    return VENOUS_TEMPLATES.VENOUS_STENT;
  }
  if (templateType === 'IVC_FILTER') {
    return VENOUS_TEMPLATES.IVC_FILTER;
  }
  if (templateType === 'PHLEBECTOMY') {
    return VENOUS_TEMPLATES.PHLEBECTOMY;
  }
  
  // Amputation
  if (templateType === 'AMPUTATION') {
    return AMPUTATION_TEMPLATES.AMPUTATION;
  }
  
  // Unlisted
  if (templateType === 'UNLISTED') {
    return UNLISTED_TEMPLATE;
  }
  
  return null;
}

// ============================================
// EXPORTS FOR TESTING
// ============================================

export const _internal = {
  getTemplateForCode,
  OPENING_TEMPLATES,
  CLOSING_TEMPLATE,
  ACCESS_TEMPLATES,
  CATHETER_TEMPLATES,
  IMAGING_ADDON_TEMPLATES,
  DIALYSIS_TEMPLATES,
  ENDO_LER_TEMPLATES,
  AORTIC_ENDO_TEMPLATES,
  CAROTID_TEMPLATES,
  OPEN_VASCULAR_TEMPLATES,
  VENOUS_TEMPLATES,
  AMPUTATION_TEMPLATES,
};
