"""Labeled evaluation cases: dictation transcript -> expected draft properties.

Synthetic transcripts written for this project (no PHI). Keep >= 15 cases;
every provider (stub or LLM) is scored against the same set.
"""

from pydantic import BaseModel


class EvalCase(BaseModel):
    id: str
    modality: str
    transcript: str
    expect_critical: bool
    critical_keyword: str | None = None
    """Substring that must appear in the draft (findings or impression)."""
    required_keywords: list[str]


CASES: list[EvalCase] = [
    EvalCase(
        id="chest-ct-normal",
        modality="CT",
        transcript=(
            "Lungs are clear bilaterally. No pleural effusion. Heart size normal. "
            "Impression: No acute cardiopulmonary abnormality."
        ),
        expect_critical=False,
        required_keywords=["clear", "effusion"],
    ),
    EvalCase(
        id="chest-ct-pneumothorax",
        modality="CT",
        transcript=(
            "Large right-sided pneumothorax with near-complete collapse of the right lung. "
            "Mediastinum is midline. Impression: large right pneumothorax."
        ),
        expect_critical=True,
        critical_keyword="pneumothorax",
        required_keywords=["pneumothorax", "right"],
    ),
    EvalCase(
        id="ct-pe",
        modality="CT",
        transcript=(
            "Filling defect in the right main pulmonary artery consistent with pulmonary embolism. "
            "No right heart strain."
        ),
        expect_critical=True,
        critical_keyword="pulmonary embolism",
        required_keywords=["filling defect", "pulmonary artery"],
    ),
    EvalCase(
        id="head-ct-hemorrhage",
        modality="CT",
        transcript=(
            "Acute intraparenchymal hemorrhage in the left basal ganglia measuring 3 cm. "
            "No midline shift at this time."
        ),
        expect_critical=True,
        critical_keyword="hemorrhage",
        required_keywords=["basal ganglia", "3 cm"],
    ),
    EvalCase(
        id="head-ct-midline-shift",
        modality="CT",
        transcript=(
            "Large left subdural collection with 8 millimeters of midline shift. "
            "Effacement of the left lateral ventricle."
        ),
        expect_critical=True,
        critical_keyword="midline shift",
        required_keywords=["subdural", "ventricle"],
    ),
    EvalCase(
        id="abdomen-ct-free-air",
        modality="CT",
        transcript=(
            "There is free air under the right hemidiaphragm concerning "
            "for hollow viscus perforation."
        ),
        expect_critical=True,
        critical_keyword="free air",
        required_keywords=["perforation", "hemidiaphragm"],
    ),
    EvalCase(
        id="mr-brain-normal",
        modality="MR",
        transcript=(
            "No restricted diffusion. No mass lesion. Ventricles are normal in size. "
            "Impression: Normal MRI of the brain."
        ),
        expect_critical=False,
        required_keywords=["diffusion", "ventricles"],
    ),
    EvalCase(
        id="mr-brain-infarct",
        modality="MR",
        transcript=(
            "Restricted diffusion in the left MCA territory compatible with acute infarct. "
            "No hemorrhagic transformation."
        ),
        expect_critical=True,
        critical_keyword="acute infarct",
        required_keywords=["restricted diffusion", "MCA"],
    ),
    EvalCase(
        id="cr-chest-normal",
        modality="CR",
        transcript=(
            "Clear lungs. Normal cardiomediastinal silhouette. No acute osseous abnormality. "
            "Impression: Normal chest radiograph."
        ),
        expect_critical=False,
        required_keywords=["lungs", "silhouette"],
    ),
    EvalCase(
        id="cr-chest-effusion",
        modality="CR",
        transcript=(
            "Moderate left pleural effusion with adjacent atelectasis. "
            "Impression: moderate left effusion, recommend follow up."
        ),
        expect_critical=False,
        required_keywords=["effusion", "atelectasis"],
    ),
    EvalCase(
        id="us-abdomen-normal",
        modality="US",
        transcript=(
            "Liver is normal in echotexture. Gallbladder without stones. No biliary dilation. "
            "Impression: Normal abdominal ultrasound."
        ),
        expect_critical=False,
        required_keywords=["liver", "gallbladder"],
    ),
    EvalCase(
        id="us-gallstones",
        modality="US",
        transcript=(
            "Multiple mobile gallstones with wall thickening of 5 "
            "millimeters and pericholecystic fluid. "
            "Sonographic Murphy sign positive. Impression: findings "
            "compatible with acute cholecystitis."
        ),
        expect_critical=False,
        required_keywords=["gallstones", "cholecystitis"],
    ),
    EvalCase(
        id="ct-aortic-dissection",
        modality="CT",
        transcript=(
            "Intimal flap in the ascending aorta extending to the arch "
            "consistent with aortic dissection "
            "Stanford type A."
        ),
        expect_critical=True,
        critical_keyword="aortic dissection",
        required_keywords=["intimal flap", "Stanford"],
    ),
    EvalCase(
        id="ct-renal-stone",
        modality="CT",
        transcript=(
            "4 millimeter obstructing calculus at the left ureterovesical "
            "junction with mild hydronephrosis. "
            "Impression: obstructing left UVJ stone."
        ),
        expect_critical=False,
        required_keywords=["calculus", "hydronephrosis"],
    ),
    EvalCase(
        id="cr-fracture",
        modality="CR",
        transcript=(
            "Nondisplaced fracture of the distal radius. Alignment is anatomic. "
            "Impression: nondisplaced distal radius fracture."
        ),
        expect_critical=False,
        required_keywords=["fracture", "radius"],
    ),
    EvalCase(
        id="ct-subdural-uk-spelling",
        modality="CT",
        transcript=(
            "Acute on chronic subdural haemorrhage along the right "
            "convexity, maximal thickness 12 mm."
        ),
        expect_critical=True,
        critical_keyword="haemorrhage",
        required_keywords=["subdural", "convexity"],
    ),
]
