/**
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 */
define(['N/url', 'N/https', 'N/ui/dialog'], 

function(url, https, dialog) {

    function pageInit(context) {

        var response = obtenerPresupuestos();

        if (response.code == 200) { // Si respuesta es OK
        
            var body = JSON.parse(response.body);
            log.debug('pageInit', body);

        } else {

            dialog.alert({ title: 'Error!', message: 'Ocurrión un error al obtener el presupuesto.' });
            return false;
        }
    }

    function saveRecord(context) {
        
    }

    function validateField(context) {
        
    }

    function fieldChanged(context) {
        
    }

    function postSourcing(context) {
        
    }

    function lineInit(context) {
        
    }

    function validateDelete(context) {

        var currentRecord = context.currentRecord;
        var sublistId = context.sublistId;
        log.debug('validateLine', sublistId);

            
        var estimated_amount = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'estimatedamount' });
        log.debug('validateLine', 'estimated_amount: ' + estimated_amount);

        return true;
    }

    function validateInsert(context) {
        
    }

    function validateLine(context) {
        
    }

    function sublistChanged(context) {
        
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged
    }

    function obtenerPresupuestos() {

        var restletUrl = url.resolveScript({
            scriptId: 'customscript_2win_rl_obtener_presupuestos',
            deploymentId: 'customdeploy_2win_rl_obtener_presupuestos'
        });

        log.debug('obtenerPresupuestos', restletUrl);

        var response = https.get({
            url: restletUrl + '&param=0'
        });
        
        log.debug('obtenerPresupuestos', response);

        return response;
    }
});
