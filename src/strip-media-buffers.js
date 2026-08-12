'use strict';

/**
 * Empêche le binaire des images d'être écrit dans la base (PV-185).
 *
 * `strapi-plugin-cloudflare-r2-assets` bufferise le flux d'upload pour l'envoyer à R2
 * (`uploadStream` → `file.buffer = Buffer.concat(chunks)`) mais **ne remet jamais ce champ à
 * zéro** ensuite. Strapi persiste alors l'objet tel quel : chaque variante d'image (thumbnail,
 * small, medium, large) emporte en base une copie complète du fichier, sérialisée en tableau
 * d'octets JSON — une forme environ quatre fois plus lourde que le binaire d'origine.
 *
 * Mesuré en production le 12/08/2026 : 4 449 médias, ~890 Ko de buffer chacun en moyenne (jusqu'à
 * 7,6 Mo), soit **~3,8 Go** de doublon. Conséquences : médiathèque inutilisable
 * (`GET /api/upload/files` en 504 même pour un seul fichier), et 13 pages du storefront tombées en
 * 503 parce qu'un article traînait 15 Mo à chaque rendu (PV-183).
 *
 * Ce hook retire le buffer juste avant l'écriture. Le fichier lui-même est déjà sur R2 : seule la
 * copie superflue disparaît. Sans lui, purger l'existant ne servirait à rien — le prochain envoi
 * d'image recréerait le problème.
 */

/** Retire `buffer` d'un objet format, en place. Renvoie true si quelque chose a été retiré. */
function stripFormat(format) {
  if (!format || typeof format !== 'object' || format.buffer === undefined) return false;
  delete format.buffer;
  return true;
}

/**
 * Nettoie un enregistrement de média : le buffer racine et celui de chaque variante.
 * Renvoie le nombre de buffers retirés.
 */
function stripBuffers(data) {
  if (!data || typeof data !== 'object') return 0;
  let removed = 0;

  if (data.buffer !== undefined) {
    delete data.buffer;
    removed++;
  }

  // `formats` peut arriver sous forme d'objet ou de chaîne JSON selon le connecteur.
  let formats = data.formats;
  let wasString = false;
  if (typeof formats === 'string') {
    try {
      formats = JSON.parse(formats);
      wasString = true;
    } catch {
      return removed;
    }
  }
  if (!formats || typeof formats !== 'object') return removed;

  for (const key of Object.keys(formats)) {
    if (stripFormat(formats[key])) removed++;
  }
  if (removed && wasString) data.formats = JSON.stringify(formats);

  return removed;
}

function registerMediaBufferStripping({ strapi }) {
  strapi.db.lifecycles.subscribe({
    models: ['plugin::upload.file'],

    beforeCreate(event) {
      const removed = stripBuffers(event.params?.data);
      if (removed) {
        strapi.log.debug(`[strip-media-buffers] ${removed} buffer(s) retiré(s) à la création`);
      }
    },

    beforeUpdate(event) {
      const removed = stripBuffers(event.params?.data);
      if (removed) {
        strapi.log.debug(`[strip-media-buffers] ${removed} buffer(s) retiré(s) à la mise à jour`);
      }
    },
  });

  strapi.log.info('[strip-media-buffers] actif — les binaires ne seront plus écrits en base');
}

module.exports = { registerMediaBufferStripping, stripBuffers };
