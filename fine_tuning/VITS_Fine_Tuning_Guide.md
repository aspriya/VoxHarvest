# Fine-Tuning VITS for Mixed Language (Sinhala/English)

Use this guide to creating a Google Colab notebook that specifically handles your mixed Sinhala/English dataset. We will use the **Plachtaa/VITS-fast-fine-tuning** repository.

## Notebook Cells

Copy the following code blocks into separate cells in a new Google Colab notebook.

### 1. Setup Environment
**Fix:** 
1. **Critical Dependencies for Multilingual Support:** Added `pypinyin`, `cn2an`, `indic_transliteration`, `eng_to_ipa`, `num_thai`, `unidecode`, and `phonemizer`.
2. **Colab Compatibility:** `torchcodec` and specific `torchaudio` versions are required for 2025 runtimes.
3. **Legacy Code Fix:** `librosa==0.9.2` prevents the "TypeError: mel() takes 0 positional arguments".

```python
# @title 1. Setup Environment
!nvidia-smi
%cd /content
!git clone https://github.com/Plachtaa/VITS-fast-fine-tuning.git
%cd VITS-fast-fine-tuning
!pip install -r requirements.txt
!pip install --upgrade tensorboard

# Install dependencies for Phonemizer
!sudo apt-get install espeak-ng 

# Fix missing python dependencies (Multilingual Support)
!pip install unidecode phonemizer pypinyin cn2an indic_transliteration eng_to_ipa num_thai

# FIX: TorchAudio / TorchCodec compatibility issues in recent Colab runtimes
# AND pin librosa to 0.9.2 to avoid "TypeError: mel() takes 0 positional arguments"
!pip install torchcodec==0.2.0 torch==2.6.0 torchaudio==2.6.0 librosa==0.9.2 --index-url https://download.pytorch.org/whl/cu124
```

### 2. Upload Your Dataset
**Fix:** We handle spaces in filenames and ensure a clean slate by removing old folders.

```python
# @title 2. Upload Dataset
import os
from google.colab import files
import shutil

%cd /content/VITS-fast-fine-tuning

# Remove ALL existing data to avoid confusion
if os.path.exists("./custom_character_voice"):
    shutil.rmtree("./custom_character_voice")
if os.path.exists("./temp_dataset"):
    shutil.rmtree("./temp_dataset")

uploaded = files.upload()
filename = next(iter(uploaded))

# Unzip the dataset
# We use quotes around the filename to handle spaces/parentheses
!unzip -q "{filename}" -d temp_dataset
print(f"Dataset {filename} uploaded and extracted.")
```

### 3. Preprocess Dataset (Correct Filename)
**Fix:** The debug run proved the script wants **`short_character_anno.txt`** in the **ROOT** folder.

```python
# @title 3. Preprocess Dataset
import os
import shutil

# CONFIG
speaker_name = "MyVoice" 
base_dir = "/content/VITS-fast-fine-tuning/custom_character_voice"
speaker_dir = os.path.join(base_dir, speaker_name)
# Clean base dir to remove any accidental 'filelists' folder from previous runs
if os.path.exists(base_dir):
    shutil.rmtree(base_dir)
os.makedirs(speaker_dir, exist_ok=True)

# Output annotation path 
# DEBUG FINDING: The script looks for this EXACT filename in the root directory.
output_path = "/content/VITS-fast-fine-tuning/short_character_anno.txt"

# 1. Path Detection
search_root = "/content/VITS-fast-fine-tuning/temp_dataset"
source_metadata = None
source_wavs = None

# Helper to find metadata in a tree
def find_metadata(root_dir):
    for r, d, f in os.walk(root_dir):
        if "metadata.csv" in f:
            meta = os.path.join(r, "metadata.csv")
            wav = os.path.join(r, "wavs")
            # If wavs folder isn't directly beside it, check root
            if not os.path.exists(wav):
                if root_dir.endswith("wavs"): # edge case
                    wav = root_dir
            if os.path.exists(wav):
                return meta, wav
    return None, None

source_metadata, source_wavs = find_metadata(search_root)

# Fallback: Global search 
if not source_metadata:
    print("MetaData not found in temp_dataset. Searching globally...")
    source_metadata, source_wavs = find_metadata("/content/VITS-fast-fine-tuning")

if not source_metadata:
    print("CRITICAL ERROR: Could not find metadata.csv anywhere!")
    raise FileNotFoundError("MetaData missing")

print(f"Using MetaData: {source_metadata}")
print(f"Using Wavs: {source_wavs}")

# 2. Processing
new_lines = []
with open(source_metadata, 'r', encoding='utf-8-sig') as f: 
    for line in f:
        parts = line.strip().split('|')
        if len(parts) >= 2:
            file_id = parts[0]
            text = parts[1]
            
            # Move/Copy Audio File
            src_audio = os.path.join(source_wavs, f"{file_id}.wav")
            dst_audio = os.path.join(speaker_dir, f"{file_id}.wav")
            
            if os.path.exists(src_audio):
                shutil.copy(src_audio, dst_audio)
                
                # RELATIVE PATH (The Fix)
                # Instead of /content/..., we use custom_character_voice/...
                rel_path = f"custom_character_voice/{speaker_name}/{file_id}.wav"
                new_lines.append(f"{rel_path}|{speaker_name}|{text}")
            else:
                print(f"Warning: Audio file missing {src_audio}")

if len(new_lines) == 0:
    print("CRITICAL ERROR: Found metadata but processed 0 lines! Check file contents.")
    raise ValueError("Zero valid lines processed")

# 3. Save
content = '\n'.join(new_lines)
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Also create the other filename just in case logic changes
with open("sampled_audio4ft.txt", 'w', encoding='utf-8') as f:
    f.write(content)

print(f"SUCCESS: Processed {len(new_lines)} lines.")
print(f"Annotations saved to: {output_path}")
```

### 4. Configure & Preprocess
**Fix:** We check config existence and ensure the annotation file is present before running.

```python
# @title 4. Preprocess & Generate Config
%cd /content/VITS-fast-fine-tuning
import os
import shutil

# Check Data
input_file = "short_character_anno.txt"
if os.path.exists(input_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        print(f"Found input file '{input_file}' with {len(f.readlines())} lines.")
else:
    print(f"CRITICAL: {input_file} is MISSING. Step 3 failed to create it in the root folder.")

# Config Bootstrapping
config_path = "./configs/finetune_speaker.json"
if not os.path.exists(config_path):
    print(f"Copying template config...")
    if os.path.exists("./configs/modified_finetune_speaker.json"):
        shutil.copy("./configs/modified_finetune_speaker.json", config_path)

# Run Preprocess
script_path = "preprocess_v2.py"
if os.path.exists(script_path):
    print(f"Running {script_path}...")
    !python {script_path} --languages "CJE"
else:
    print(f"Could not find {script_path}!")
```

### 5. Start Training (Checkpoint Patcher)
**Fix:** 
1. **Download Base Model:** We manually download the pretrained VITS model.
2. **Patch Checkpoint:** We added a script to `load` `G_0.pth`, remove the `enc_p.emb.weight` layer (which has size mismatch error 68 vs 78), and save it back. This allows training to proceed.
3. `monotonic_align` build requires the `monotonic_align` subdirectory to exist, so we create it.
4. `train.py` is missing, so we use `finetune_speaker_v2.py`.

```python
# @title 5. Start Training
%cd /content/VITS-fast-fine-tuning/monotonic_align

# 1. Fix Build
# The setup script tries to write to a 'monotonic_align' subdirectory (e.g. monotonic_align/monotonic_align/core.so)
# We must create this nested folder first.
import os
os.makedirs("monotonic_align", exist_ok=True)

!python setup.py build_ext --inplace
%cd ..

# 2. Download Pretrained Base Model (The Fix)
# The training script assumes these exist.
import os
import torch
os.makedirs("pretrained_models", exist_ok=True)

# --- FIX: Patch mel_processing.py for librosa >= 0.10.0 compatibility ---
# Newer librosa versions require keyword arguments for filters.mel using 'sr' instead of positional args.
!sed -i 's/mel = librosa_mel_fn(sampling_rate, n_fft, num_mels, fmin, fmax)/mel = librosa_mel_fn(sr=sampling_rate, n_fft=n_fft, n_mels=num_mels, fmin=fmin, fmax=fmax)/' mel_processing.py
# -----------------------------------------------------------------------

# --- FIX: Downgrade Matplotlib (Issue with tostring_rgb in 3.8+) ---
!pip install "matplotlib<3.8" > /dev/null
# -------------------------------------------------------------------

# URL source: Plachtaa HuggingFace space (standard for this repo)
# G_0.pth (Generator) and D_0.pth (Discriminator)
if not os.path.exists("pretrained_models/G_0.pth"):
    print("Downloading Pretrained Generator (G_0.pth)...")
    !wget -c https://huggingface.co/spaces/Plachta/VITS-Umamusume-voice-synthesizer/resolve/main/pretrained_models/G_trilingual.pth -O pretrained_models/G_0.pth

if not os.path.exists("pretrained_models/D_0.pth"):
    print("Downloading Pretrained Discriminator (D_0.pth)...")
    !wget -c https://huggingface.co/spaces/Plachta/VITS-Umamusume-voice-synthesizer/resolve/main/pretrained_models/D_trilingual.pth -O pretrained_models/D_0.pth

# 3. Patch Checkpoint (Size Mismatch Fix)
# The default checkpoint has (68, 192) embedding, but our new config has (78, 192).
# We must remove the embedding layer from the checkpoint so it can be re-initialized.
print("Checking for header mismatch...")
checkpoint_path = "pretrained_models/G_0.pth"
checkpoint = torch.load(checkpoint_path, map_location='cpu')

if 'model' in checkpoint:
    state_dict = checkpoint['model']
    if 'enc_p.emb.weight' in state_dict:
        # Check size if needed, or just blindly remove to be safe for fine-tuning
        # print(f"Original Embed Size: {state_dict['enc_p.emb.weight'].shape}")
        del state_dict['enc_p.emb.weight']
        print("Removed mismatching 'enc_p.emb.weight' from checkpoint.")
        
        # Save back
        torch.save(checkpoint, checkpoint_path)
        print("Fixed checkpoint saved to G_0.pth")

# 4. Run Training
# The script has been renamed to finetune_speaker_v2.py
train_script = "finetune_speaker_v2.py"
if not os.path.exists(train_script):
    # Fallback check
    if os.path.exists("train.py"):
        train_script = "train.py"

if os.path.exists(train_script):
    print(f"Starting training with {train_script}...")
    # Using the config we prepared in step 4
    !python {train_script} -m output_model --max_epochs 100 --drop_speaker_embed True
else:
    print("ERROR: Could not find train script! Listing files:")
    print(os.listdir("."))
```

### 6. Inference (Test your model)
After training is done (you can stop it manually when the loss looks low, usually < 2.0 or after 50-100 epochs), run this to test.

> **Note:** If you see `ValueError: numpy.dtype size changed`, it means Numpy/Scipy mismatch. The cell below automatically fixes this.

```python
# @title 6. Inference
# --- FIX: Binary Incompatibility (Numpy/Scipy) ---
# Previous steps might have downgraded Numpy, breaking the pre-installed Scipy.
!pip install --force-reinstall scipy numpy > /dev/null
# -------------------------------------------------

from models import SynthesizerTrn
from text import text_to_sequence
import torch
from scipy.io.wavfile import write
import json
import commons
import utils

# Load config and model
config_path = "configs/modified_finetune_speaker.json"
model_path = "output_model/G_latest.pth" # Or specific step like G_1000.pth

hps = utils.get_hparams_from_file(config_path)
net_g = SynthesizerTrn(
    len(hps.symbols),
    hps.data.filter_length // 2 + 1,
    hps.train.segment_size // hps.data.hop_length,
    n_speakers=hps.data.n_speakers,
    **hps.model).cuda()
_ = net_g.eval()
_ = utils.load_checkpoint(model_path, net_g, None)

def tts(text):
    stn_tst = text_to_sequence(text, hps.symbols, hps.data.text_cleaners)
    with torch.no_grad():
        x_tst = torch.LongTensor(stn_tst).unsqueeze(0).cuda()
        x_tst_lengths = torch.LongTensor([stn_tst.size(0)]).cuda()
        sid = torch.LongTensor([0]).cuda()
        # You might need to adjust the speaker ID (sid) if your custom speaker is not 0
        audio = net_g.infer(x_tst, x_tst_lengths, sid=sid, noise_scale=.667, noise_scale_w=0.8, length_scale=1)[0][0,0].data.cpu().float().numpy()
    write("output.wav", hps.data.sampling_rate, audio)
    return "output.wav"

# Test
from IPython.display import Audio
text_to_test = "Office එකේ AC එක පොඩ්ඩක් වැඩි කරන්න පුළුවන්ද?"
output_file = tts(text_to_test)
Audio(output_file)
```
