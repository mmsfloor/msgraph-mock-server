const crypto = require('crypto');

/**
 * Identity Resolution Rules (STRICT)
 * 
 * 1. If from OR properties.importedBy.RawValue exists:
 *    canonical_user_id = that MRI
 *    identity_type = "mri"
 * 
 * 2. If no MRI but displayName exists:
 *    canonical_user_id = "display::" + sha256(displayName + chatId)
 *    identity_type = "display_only"
 * 
 * 3. If no from, no importedBy, no displayName:
 *    mark as "no_identity"
 *    These messages MUST be excluded from API output.
 */

function resolveIdentity(rawMessage, chatId) {
    const from = rawMessage.from;
    const importedBy = rawMessage.properties?.importedBy?.RawValue;
    const displayName = rawMessage.displayName;

    const mri = from || importedBy;

    if (mri) {
        return {
            canonical_user_id: mri,
            identity_type: 'mri',
            original_from: from || null,
            original_importedBy: importedBy || null,
            original_displayName: displayName || null
        };
    }

    if (displayName) {
        // Generate deterministic canonical id using SHA-256
        const hash = crypto.createHash('sha256')
            .update(displayName + chatId)
            .digest('hex');
            
        return {
            canonical_user_id: `display::${hash}`,
            identity_type: 'display_only',
            original_from: null,
            original_importedBy: null,
            original_displayName: displayName
        };
    }

    return {
        canonical_user_id: null,
        identity_type: 'no_identity',
        original_from: null,
        original_importedBy: null,
        original_displayName: null
    };
}

module.exports = {
    resolveIdentity
};
