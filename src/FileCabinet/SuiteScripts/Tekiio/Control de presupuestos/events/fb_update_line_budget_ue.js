/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
* @name FB - Update line budget - UE
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Descripción
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> Fecha
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> Registro en Netsuite <ID del registro>
*/
define(['N/log', 'N/url', 'N/https', 'N/record'],
    /**
     * @param{log} log
     * @param{url} url
     */
    (log, url, https, record) => {

        const DATA_SL_SERVICE = {};
        DATA_SL_SERVICE.SCRIPID = 'customscript_fb_suitelet_service_consult';
        DATA_SL_SERVICE.DEPLOYID = 'customdeploy_fb_suitelet_service_consult'
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            try {
                log.audit({ title: 'Entrando a beforeLoad', details: scriptContext });
                log.audit({ title: 'Tipo', details: scriptContext.newRecord.type });

                var newRecord = scriptContext.newRecord
                var oldRecord = scriptContext.oldRecord
                log.audit({ title: 'Entrando a beforeSubmit nuevo registro', details: newRecord });
                let statusNew = newRecord.getValue({ fieldId: 'approvalstatus' }) || 'NA';
                let status = newRecord.getValue({ fieldId: 'status' }) || 'NA';
                let statusRef = newRecord.getValue({ fieldId: 'statusref' }) || 'NA';
                log.audit({ title: 'Estados base', details: { status, statusNew, statusRef } });
                if (status === 'Orden pendiente' && statusNew === '2' && newRecord.type === 'purchaserequisition') {
                    var idRecord = '';
                    var typeTran = '';
                    switch (newRecord.type) {
                        case '':
                            break;
                        case 'purchaserequisition':
                            idRecord = parseInt(newRecord.id)
                            typeTran = newRecord.type
                            break;
                    }
                    var url_service_sl = url.resolveScript({
                        scriptId: DATA_SL_SERVICE.SCRIPID,
                        deploymentId: DATA_SL_SERVICE.DEPLOYID,
                        returnExternalUrl: true,
                        params: {
                            operador: 'update_cancel_line_budget_oc',
                            idRecord: idRecord,
                            typeTran: typeTran
                        }
                    });
                    log.audit({
                        title: 'Parametros a enviar', details: {
                            operador: 'update_cancel_line_budget_oc',
                            valores: {
                                idRecord: idRecord,
                                typeTran: typeTran
                            }
                        }
                    });
                    
                    var response = https.get({ url: url_service_sl })
                    log.audit({ title: 'response', details: response.body });
                }
            } catch (e) {
                log.error({ title: 'Error beforeLoad:', details: e });
            }

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                var newRecord = scriptContext.newRecord
                var oldRecord = scriptContext.oldRecord
                log.audit({ title: 'Entrando a beforeSubmit nuevo registro', details: newRecord });
                log.audit({ title: 'Entrando a beforeSubmit viejo registro', details: oldRecord });
                let statusOld = oldRecord.getValue({ fieldId: 'approvalstatus' }) || 'NA';
                let statusNew = newRecord.getValue({ fieldId: 'approvalstatus' }) || 'NA';
                switch (newRecord.type) {
                    case 'vendorpayment':
                    case 'purchaseorder':
                        if (statusOld === '1' && statusNew === '2') {
                            log.audit({ title: 'Actualizando linea de budget:', details: { statusNew, statusOld } });
                            var idRecord = '';
                            var typeTran = '';
                            switch (newRecord.type) {
                                case 'vendorpayment':
                                    let id = 0;
                                    let type = '';
                                    let noLines = newRecord.getLineCount({ sublistId: 'apply' })
                                    log.audit({ title: 'noLines', details: noLines });
                                    var objSublist = newRecord.getSublistFields({ sublistId: 'apply' });
                                    log.audit({ title: 'Sublistas', details: objSublist });
                                    for (let index = 0; index < noLines; index++) {
                                        let apply = newRecord.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: index });
                                        if (apply === true || apply === 'T') {
                                            id = parseInt(newRecord.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: index }));
                                            type = newRecord.getSublistValue({ sublistId: 'apply', fieldId: 'trantype', line: index });
                                        }
                                    }
                                    type = record.Type.VENDOR_BILL
                                    // type = type.toLowerCase()
                                    log.audit({ title: 'id', details: { id, type } });
                                    idRecord = id
                                    typeTran = type
                                    break;
                                case 'purchaseorder':
                                    idRecord = parseInt(newRecord.id)
                                    typeTran = newRecord.type
                                    break;
                            }
                            var url_service_sl = url.resolveScript({
                                scriptId: DATA_SL_SERVICE.SCRIPID,
                                deploymentId: DATA_SL_SERVICE.DEPLOYID,
                                returnExternalUrl: true,
                                params: {
                                    operador: 'update_line_budget_oc',
                                    idRecord: idRecord,
                                    typeTran: typeTran
                                }
                            });
                            log.audit({
                                title: 'Parametros a enviar', details: {
                                    operador: 'update_line_budget_oc',
                                    valores: {
                                        idRecord: idRecord,
                                        typeTran: typeTran
                                    }
                                }
                            });

                            var response = https.get({ url: url_service_sl })
                            log.audit({ title: 'response', details: response.body });
                        }
                        break;
                }
            } catch (e) {
                log.error({ title: 'Error beforeSubmit:', details: e });
            }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
        */
        const afterSubmit = (scriptContext) => {
            try {
                log.audit({ title: 'Entrando a afterSubmit', details: scriptContext });
            } catch (e) {
                log.error({ title: 'Error afterSubmit:', details: e });
            }

        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            // afterSubmit: afterSubmit
        }

    });
