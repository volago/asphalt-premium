import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Wczytujemy pliki .js i używamy funkcji eval() do zdefiniowania ich w globalnym scope,
// tak jak to się dzieje w przypadku <iframe> lub <script> w przeglądarce.
// W ten sposób omijamy problem braku obsługi ES Modules (export/import) w plikach aplikacji.

const configCode = fs.readFileSync(path.resolve(__dirname, '../js/config.js'), 'utf-8');
const confirmationModalCode = fs.readFileSync(path.resolve(__dirname, '../js/confirmation-modal.js'), 'utf-8');

// Definiujemy globalną zmienną dla CONFIG
eval(configCode + '\n;globalThis.CONFIG = typeof module !== "undefined" && module.exports ? module.exports : CONFIG;');

eval(confirmationModalCode + '\n;globalThis.ConfirmationModal = ConfirmationModal;');
const Modal = globalThis.ConfirmationModal;

describe('ConfirmationModal._buildBodyHTML', () => {
    it('generuje poprawne ostrzeżenie dla tej samej starej wartości gdy skippedCount > 0', () => {
        const html = Modal._buildBodyHTML(1234, 'good', 'excellent', 2);
        
        expect(html).toContain('<strong>2</strong> odcinki zostały pominięte');
        expect(html).toContain('Ta droga już ma przypisaną jakość nawierzchni.');
    });
    
    it('generuje komunikat o pojedynczym pominiętym odcinku', () => {
        const html = Modal._buildBodyHTML(1234, 'brak danych', 'excellent', 1);
        
        expect(html).toContain('<strong>1</strong> odcinek został pominięty');
    });
});
