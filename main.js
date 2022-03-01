var userAgent = window.navigator.userAgent.toLowerCase();
var isChrome = 0;

if (userAgent.indexOf('msie') != -1 || userAgent.indexOf('trident') != -1) {
  // IE
} else if (userAgent.indexOf('edge') != -1) {
  // Edge
} else if (userAgent.indexOf('chrome') != -1) {
  // Chrome
  isChrome = 1;
} else if (userAgent.indexOf('safari') != -1) {
  // Safari
} else if (userAgent.indexOf('firefox') != -1) {
  // Firefox
} else if (userAgent.indexOf('opera') != -1) {
  // Opera
} else {
  
}

if (!isChrome) {
  alert('Google Chrome Lütfen şu adresten erişin:')
  document.getElementById('status').innerHTML = "Google Chrome Lütfen şu adresten erişin:";
  document.getElementById('status').className = "error";
  exit;
}

// https://qiita.com/qiita_mona/items/e58943cf74c40678050a
// getUserMedia 
if (typeof navigator.mediaDevices.getUserMedia !== 'function') {
  const err = new Error('getUserMedia()Kullanılamaz');
  alert(`${err.name} ${err.message}`);
  throw err;
}

const $video = document.getElementById('result_video'); // video görübtüleme alanı

// select seçeneğini temizle
function clearSelect(select) {
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
}

// Öğe seçme seçeneğinde seçenek.değeri değer olan bir öğe varsa seçin
// Seçenekte karşılık gelen bir öğe varsa, dönüş değeri doğrudur
function selectValueIfExists(select, value) {
  if (value === null || value === undefined) return;
  var result = false;
  select.childNodes.forEach(n => {
    if (n.value === value) {
      select.value = value;
      result = true;
    }
  })
  return result;
}

// Kameraları numaralandır ve select_camera nesnesi seçeneğine ayarla
// Referans: https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
// deviceInfos: MediaDeviceInfo []
// Argümanın MediaDevices.enumerateDevices () dönüş değerinin Promise içeriği olduğunu varsayarsak
// Referans: https://developer.mozilla.org/ja/docs/Web/API/MediaDevices/enumerateDevices
function updateCameraSelector(deviceInfos) {
// Sonunda seçilen öğeyi yeniden seçmeyi unutmayın
  const selectedDevice = select_camera.value;
  // Mevcut seçenekleri temizle
  clearSelect(select_camera);
// Medya cihazı listesinde, seçilecek bir seçenek öğesi olarak video girişi ekleyin
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    if (deviceInfo.kind === 'videoinput') {
      const option = document.createElement('option');
      option.value = deviceInfo.deviceId;
      option.text = deviceInfos[i].label || `camera ${select_camera.length + 1}`;
      select_camera.appendChild(option);
    }
  }
// Orijinal olarak seçilen bir öğe varsa, o öğeyi tekrar seçin
  selectValueIfExists(select_camera, selectedDevice);
}
// Video öğesinde akışı ayarlayın ve bir medya listesi döndürün (kamera, mikrofon)
// Referans: https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
function handleStream(stream) {
  window.stream = stream;
  $video.srcObject = stream;
  return navigator.mediaDevices.enumerateDevices();
}

// Ayarlara göre kamera görüntüsünü göster
// isInit: yalnızca kamera seçeneği olmadığında true, other (seçenekleri değiştirirken veya kayıtlı ayarlardan geri yüklerken) gereksizdir
// Referans: https://github.com/webrtc/samples/blob/gh-pages/src/content/devices/input-output/js/main.js
function setupCamera(isInit) {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const videoSource = select_camera.value;
  const constraints = {
    video: {
      aspectRatio: {
        ideal: 1.7777777778
      },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };
  if (isInit !== true) {
    constraints.video["deviceId"] = videoSource ? {
      exact: videoSource
    } : undefined;
  }
  navigator.mediaDevices.getUserMedia(constraints)
    .then(handleStream)
    .then(updateCameraSelector)
    .catch(onCameraError);
}

// Kamerayı ilk kez başlat
function initCamera() {
  const conf = JSON.parse(localStorage.speech_to_text_config || '{}');
  var camera_selected = false;
  if (typeof conf.select_camera !== 'undefined') {
    if (selectValueIfExists(select_camera, conf.select_camera)) {
// Kamera seçimi kaydedilir ve eğer seçim seçeneğinde ise seçilen kamera başlatılır.
      camera_selected = true;
      setupCamera();
    }
  }
  if (!camera_selected) {
  // Kamera ayarları yapılmadıysa varsayılan kamera ile başlayın
    setupCamera(true); // Argüman, varsayılan kamera seçimi anlamına gelir
  }
}

function onCameraError(err) {
  console.log(`Kamerayla ilgili sorunlar：${err.name} / ${err.message}`)
  alert(`Kamera görüntüsü okunamadı. Tarayıcı erişim kısıtlamaları gibi ayarları kontrol edin`);
  document.getElementById('help_on_error').style.display = 'block';
}
// Kamera seçenekleri oluştur
navigator.mediaDevices.enumerateDevices()
  .then(updateCameraSelector)
  .then(initCamera)
  .catch(onCameraError);

// ses tanıma
// Referans: https://jellyware.jp/kurage/iot/webspeechapi.html
var flag_speech = 0;
var recognition;
var lang = 'en';
var last_finished = ''; // Son onaylanan kısım. Sabit parçanın anında kaybolmaması için burada tanımlanmıştır.
var textUpdateTimeoutID = 0;
var textUpdateTimeoutSecond = 30; // Ses tanıma sonucu güncellenmezse temizlenecek saniye sayısı (0 veya daha az ise otomatik olarak silinmeyecektir)

function vr_function() {
  window.SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
  recognition = new webkitSpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onsoundstart = function() {
    document.getElementById('status').innerHTML = "çalışıyor...";
    document.getElementById('status').className = "processing";
  };
  recognition.onnomatch = function() {
    document.getElementById('status').innerHTML = "Ses tanınamadı";
    document.getElementById('status').className = "error";
  };
  recognition.onerror = function() {
    document.getElementById('status').innerHTML = "hata";
    document.getElementById('status').className = "error";
    if (flag_speech == 0)
      vr_function();
  };
  recognition.onsoundend = function() {
    document.getElementById('status').innerHTML = "dur";
    document.getElementById('status').className = "error";
    vr_function();
  };

  recognition.onresult = function(event) {
    var results = event.results;
    var current_transcripts = ''; // Birden fazla sonuç varsa hepsini birleştir.
    var need_reset = false;
    for (var i = event.resultIndex; i < results.length; i++) {
      if (results[i].isFinal) {
        last_finished = results[i][0].transcript;
        if (lang == 'en') {
          last_finished += '。';
        }

        var result_log = last_finished

        if (document.getElementById('checkbox_timestamp').checked) {
         // Zaman damgası işlevi
          var now = new window.Date();
          var Year = now.getFullYear();
          var Month = (("0" + (now.getMonth() + 1)).slice(-2));
          var Date = ("0" + now.getDate()).slice(-2);
          var Hour = ("0" + now.getHours()).slice(-2);
          var Min = ("0" + now.getMinutes()).slice(-2);
          var Sec = ("0" + now.getSeconds()).slice(-2);

          var timestamp = Year + '-' + Month + '-' + Date + ' ' + Hour + ':' + Min + ':' + Sec + '&#009;'
          result_log = timestamp + result_log
        }

        document.getElementById('result_log').insertAdjacentHTML('beforeend', result_log + '\n');
        textAreaHeightSet(document.getElementById('result_log'));
        need_reset = true;
        setTimeoutForClearText();
        flag_speech = 0;
      } else {
        current_transcripts += results[i][0].transcript;
        clearTimeoutForClearText();
        flag_speech = 1;
      }
    }

    if (document.getElementById('checkbox_hiragana').checked && lang == 'en') {
      document.getElementById('result_text').innerHTML 
        = [resultToHiragana(last_finished), resultToHiragana(current_transcripts)].join('<br>');
    } else {
      document.getElementById('result_text').innerHTML 
        = [last_finished, current_transcripts].join('<br>');
    }
    setTimeoutForClearText();

    if (need_reset) { vr_function(); }
  }

  flag_speech = 0;
  document.getElementById('status').innerHTML = "bekleniyor...";
  document.getElementById('status').className = "ready";
  recognition.start();
}

function updateTextClearSecond() {
  const sec = Number(document.getElementById('select_autoclear_text').value);
  if ((!isNaN(sec)) && isFinite(sec) && (sec >= 0)) {
    textUpdateTimeoutSecond = sec;
  }
}

function clearTimeoutForClearText() {
  if (textUpdateTimeoutID !== 0) {
    clearTimeout(textUpdateTimeoutID);
    textUpdateTimeoutID = 0;
  }
}

// textUpdateTimeoutSecond değişkenine göre bir zamanlayıcı ayarlayın.
// Zamanlayıcının süresi dolduğunda altyazıları otomatik olarak sil.
// Değişkenin değeri sıfırdan küçük veya sıfıra eşitse zamanlayıcı ayarlanmaz.
// Zamanlayıcı zaten çalışıyorsa, işleme zamanlamasının üzerine daha sonraki bir zamanla yazılacaktır.
function setTimeoutForClearText() {
  if (textUpdateTimeoutSecond <= 0) return;

  clearTimeoutForClearText();
  textUpdateTimeoutID = setTimeout(
    () => {
      document.getElementById('result_text').innerHTML = "";
      last_finished = ''; // Önceki onay sonucunu temizle.
      textUpdateTimeoutID = 0;
    },
    textUpdateTimeoutSecond * 1000);
}
// Tanıma sonucu günlüğünün metin alanını otomatik olarak dönüştür

function textAreaHeightSet(argObj) {

  argObj.style.height = "10px";
  var wSclollHeight = parseInt(argObj.scrollHeight);

  var wLineH = parseInt(argObj.style.lineHeight.replace(/px/, ''));

  if (wSclollHeight < (wLineH * 2)) {
    wSclollHeight = (wLineH * 2);
  }
 
  argObj.style.height = wSclollHeight + "px";
}

document.addEventListener('keydown',
  event => {
    if (event.key === 'Enter') {
      if (flag_speech == 1) {
        recognition.stop();
      }
    }
  });

function downloadLogFile() {
  const a = document.createElement('a');
  a.href = 'data:text/plain,' + encodeURIComponent(document.getElementById('result_log').value);

  var now = new window.Date();
  var Year = now.getFullYear();
  var Month = (("0" + (now.getMonth() + 1)).slice(-2));
  var Date = ("0" + now.getDate()).slice(-2);
  var Hour = ("0" + now.getHours()).slice(-2);
  var Min = ("0" + now.getMinutes()).slice(-2);
  var Sec = ("0" + now.getSeconds()).slice(-2);

  a.download = 'log_' + Year + Month + Date + '_' + Hour + Min + Sec + '.txt';

  a.click();
}


/**
 
 *
 * @param {function} callback
 */
function eventFullScreen(callback) {
  document.addEventListener("fullscreenchange", callback, false);
  document.addEventListener("webkitfullscreenchange", callback, false);
  document.addEventListener("mozfullscreenchange", callback, false);
  document.addEventListener("MSFullscreenChange", callback, false);
}

/**

 *
 * @return {boolean}
 */
function enabledFullScreen() {
  return (
    document.fullscreenEnabled || document.mozFullScreenEnabled || document.documentElement.webkitRequestFullScreen || document.msFullscreenEnabled
  );
}

/**

 *
 * @param {object} [element]
 */
function goFullScreen(element = null) {

  const doc = window.document;
  const docEl = (element === null) ? doc.documentElement : element;
  let requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
  requestFullScreen.call(docEl);
}


function cancelFullScreen() {
  const doc = window.document;
  const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
  cancelFullScreen.call(doc);
}

function getFullScreenObject() {
  const doc = window.document;
  const objFullScreen = doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;
  return (objFullScreen);
}

const FullScreenBtn = document.querySelector("#FullScreenBtn"); 

const objResultText = document.querySelector("#result_text");
var font_size_windowed = parseFloat(getComputedStyle(objResultText).getPropertyValue('font-size'));
var flag_font_size_styled = 0;

window.onload = () => {
  vr_function();
  const video_doc = document.querySelector("#video_wrapper"); 

 
  FullScreenBtn.addEventListener("click", () => {
    if (getFullScreenObject()) {
     
      cancelFullScreen(video_doc);
    } else {
     
      if (!enabledFullScreen()) {
        alert("Tam ekranı desteklemiyor");
        return (false);
      }
      goFullScreen(video_doc);

    }
  });


  eventFullScreen(() => {
   
    if (getFullScreenObject()) {
      
      const ratio = window.parent.screen.height / document.querySelector("#result_video").clientHeight
      font_size_windowed = parseFloat(getComputedStyle(objResultText).getPropertyValue('font-size'));
      if (objResultText.style.fontSize) {
       
        flag_font_size_styled = 1;
        font_size_windowed = parseFloat(getComputedStyle(objResultText).fontSize);
      }
      document.querySelector('#result_text').style.fontSize = parseFloat(getComputedStyle(objResultText).getPropertyValue('font-size')) * ratio + 'px';
      console.log("Tam ekran başlangıcı");

    } else {

      if (flag_font_size_styled) {
        document.querySelector('#result_text').style.fontSize = document.querySelector("#value_font_size").textContent + 'px';
      } else {
      
        document.querySelector('#result_text').style.fontSize = '';
      }
      console.log("Tam ekranı sonlandır");

    }
  });

  initConfig();
};




var langs = [
  ['Japanese', ['ja-JP']],
  ['English', ['en-US', 'United States'],
    ['en-AU', 'Australia'],
    ['en-CA', 'Canada'],
    ['en-IN', 'India'],
    ['en-KE', 'Kenya'],
    ['en-TZ', 'Tanzania'],
    ['en-GH', 'Ghana'],
    ['en-NZ', 'New Zealand'],
    ['en-NG', 'Nigeria'],
    ['en-ZA', 'South Africa'],
    ['en-PH', 'Philippines'],
    ['en-GB', 'United Kingdom'],
  ],

  ['Deutsch', ['de-DE']],
  ['Español', ['es-AR', 'Argentina'],
    ['es-BO', 'Bolivia'],
    ['es-CL', 'Chile'],
    ['es-CO', 'Colombia'],
    ['es-CR', 'Costa Rica'],
    ['es-EC', 'Ecuador'],
    ['es-SV', 'El Salvador'],
    ['es-ES', 'España'],
    ['es-US', 'Estados Unidos'],
    ['es-GT', 'Guatemala'],
    ['es-HN', 'Honduras'],
    ['es-MX', 'México'],
    ['es-NI', 'Nicaragua'],
    ['es-PA', 'Panamá'],
    ['es-PY', 'Paraguay'],
    ['es-PE', 'Perú'],
    ['es-PR', 'Puerto Rico'],
    ['es-DO', 'República Dominicana'],
    ['es-UY', 'Uruguay'],
    ['es-VE', 'Venezuela']
  ],

  ['Français', ['fr-FR']],

  ['Italiano', ['it-IT', 'Italia'],
    ['it-CH', 'Svizzera']
  ],

   ['Türkçe', ['tr-TR']],

 ['Pусский', ['ru-RU']],

];

for (var i = 0; i < langs.length; i++) {
  select_language.options[i] = new Option(langs[i][0], i);
}


select_language.selectedIndex = 0;
updateCountry();
select_dialect.selectedIndex = 0;

function updateCountry() {
  for (var i = select_dialect.options.length - 1; i >= 0; i--) {
    select_dialect.remove(i);
  }
  var list = langs[select_language.selectedIndex];
  for (var i = 1; i < list.length; i++) {
    select_dialect.options.add(new Option(list[i][1], list[i][0]));
  }
  select_dialect.style.display = list[1].length == 1 ? 'none' : 'inline';
  updateLanguage()
}

function updateLanguage() {
  var flag_recognition_stopped = 0;
  if (recognition) {
    recognition.stop();
    flag_recognition_stopped = 1;
  }
  lang = select_dialect.value;
  if (flag_recognition_stopped) {
    vr_function();
  }

  var el_status_kuromoji_loading = document.getElementById('status_kuromoji_loading');
  var el_checkbox_hiragana = document.getElementById('checkbox_hiragana_wrapper');
  if (lang == 'en') {
    el_status_kuromoji_loading.style.display = "inline-block";
    el_checkbox_hiragana.style.display = "inline";
  } else {
    el_status_kuromoji_loading.style.display = "none";
    el_checkbox_hiragana.style.display = "none";
  }
}


//  https://pisuke-code.com/js-usage-of-google-trans-api/
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, 'google_translate_element');
}

//  https://www.google.com/intl/ja/chrome/demos/speech.html
var fonts_custom = [
  ['Noto Sans JP', "'Noto Sans JP', sans-serif"],
  ['BIZ UD ゴシック（Windows 10）', "'BIZ UDゴシック', 'BIZ UDGothic', 'Noto Sans JP', sans-serif"],
  ['BIZ UD 明朝（Windows 10）', "'BIZ UD明朝', 'BIZ UDMincho', 'Noto Sans JP', sans-serif"],
  ['游ゴシック', "游ゴシック体, 'Yu Gothic', YuGothic, sans-serif"],
  ['メイリオ', "'メイリオ', 'Meiryo', 'Noto Sans JP', sans-serif"],
  ['ポップ体（Windows）', "'HGS創英角ﾎﾟｯﾌﾟ体', 'Noto Sans JP', sans-serif"],
  ['ゴシック体（ブラウザ標準）', "sans-serif"],
  ['明朝体（ブラウザ標準）', "serif"]
];

for (var i = 0; i < fonts_custom.length; i++) {
  select_font.options[i] = new Option(fonts_custom[i][0], i);
}


select_font.selectedIndex = 0;

const config = JSON.parse(localStorage.speech_to_text_config || '{}');

function initConfig() {
  function triggerEvent(type, elem) {
    const ev = document.createEvent('HTMLEvents');
    ev.initEvent(type, true, true);
    elem.dispatchEvent(ev);
  }
  ['slider_font_size',
    'slider_opacity',
    'slider_text_shadow_stroke',
    'slider_text_stroke',
    'slider_line_height',
    'slider_letter_spacing',
    'selector_text_color',
    'selector_text_shadow_color',
    'selector_text_stroke_color',
    'slider_text_bg_opacity',
    'selector_text_bg_color',
    'selector_video_bg',
  ].forEach(id => {
    if (typeof config[id] !== 'undefined') {
      const el = document.getElementById(id);
      el.value = config[id];
      triggerEvent('input', el);
    }
  });
  ['video_bg',
    'result_video',
    'text_overlay_wrapper',
    'FullScreenBtn'
  ].forEach(id => {
    if (typeof config[id] !== 'undefined') {
      const el = document.getElementById(id);
      if (config[id]) {
        Object.keys(config[id]).forEach(key => {
          if (config[id][key]) {
            el.classList.add(key);
          } else {
            el.classList.remove(key);
          }
        });
      }
    }
  });
  
  ['checkbox_controls',
    'checkbox_log',
    'checkbox_timestamp',
    'checkbox_hiragana'
  ].forEach(id => {
    const el = document.getElementById(id);
    if(el){
      if (typeof config[id] !== 'undefined') {
        el.checked = config[el.id];
        triggerEvent('input', el);
      }
      el.addEventListener('input', function (e) {
        updateConfig(e.target.id, e.target.checked);
      });
    }
  });

  if (typeof config.position !== 'undefined') {
    const el = document.getElementById(config.position);
    el.checked = 'checked';
    triggerEvent('input', el);
  }
  if (typeof config.select_font !== 'undefined') {
    select_font.selectedIndex = config.select_font;
    triggerEvent('change', select_font);
  }
  if (typeof config.select_autoclear_text !== 'undefined') {
    const el = document.getElementById('select_autoclear_text');
    selectValueIfExists(el, config.select_autoclear_text);
    triggerEvent('change', el);
  }

  document.querySelectorAll('input.control_input').forEach(
    el => el.addEventListener('input', updateConfigValue)
  );
  document.querySelectorAll('input[name="selector_position"]').forEach(
    el => el.addEventListener('input', ev => updateConfig('position', el.id))
  );
  document.querySelector('#select_camera').addEventListener('change', updateConfigValue);
  document.querySelector('#select_font').addEventListener('change', updateConfigValue);

  document.querySelector('#select_autoclear_text').addEventListener('change', updateConfigValue);
}

function updateConfig(key, value) {
  config[key] = value;
  localStorage.speech_to_text_config = JSON.stringify(config);
}

function updateConfigClass(key, value_key, value) {
  if (config[key] == undefined) {
    config[key] = {};
  }
  config[key][value_key] = value;
  localStorage.speech_to_text_config = JSON.stringify(config);
}

function toggleClass(id, className) {
  const el = document.getElementById(id);
  const value = el.classList.toggle(className);
  updateConfigClass(id, className, value);
}

function updateConfigValue() {
  updateConfig(this.id, this.value);
}

function deleteConfig() {
  localStorage.removeItem('speech_to_text_config');
  location.reload();
}


let kuromojiObj;

function initKuromoji(checkbox) {
  if (checkbox.checked == true && kuromojiObj == undefined) {
    document.getElementById('status_kuromoji_loading').innerHTML = "Hiragana verileri okunuyor...";
    document.getElementById('status_kuromoji_loading').className = "processing";
    kuromoji.builder({
      dicPath: "kuromoji/dict/"
    }).build(function(err, tokenizer) {
      kuromojiObj = tokenizer
      document.getElementById('status_kuromoji_loading').innerHTML = "Hiragana veri okuması tamamlandı";
      document.getElementById('status_kuromoji_loading').className = "ready";
    });
  }
}

// Sonucu hiragana yap
function resultToHiragana(text) {
  if (text == null || text.length === 0) return '';
  if (kuromojiObj == undefined) {
    return text;
  }
  var kuromoji_result = kuromojiObj.tokenize(text);
  var result_hiragana = '';
  for (var i = 0; i < kuromoji_result.length; i++) {
    if (kuromoji_result[i].word_type == "KNOWN") {
      result_hiragana += kuromoji_result[i].reading;
    } else {
      result_hiragana += kuromoji_result[i].surface_form;
    }
  }
  return katakanaToHiragana(result_hiragana);
}

function katakanaToHiragana(src) {
  return src.replace(/[\u30a1-\u30f6]/g, function(match) {
    var chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}
