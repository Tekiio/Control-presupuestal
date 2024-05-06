/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
* @name FB - Set vendor to line - UE
* @version 1.0
* @author Ricardo López <ricardo.lopez@freebug.mx>
* @summary Script que coloca a nivel linea el proveedor
* @copyright Tekiio México 2022
* 
* Cliente       -> Cliente
* Last modification  -> 08/11/2023
* Modified by     -> Ricardo López <ricardo.lopez@freebug.mx>
* Script in NS    -> FB - Set vendor to line - UE <fb_set_vendor_to_line_ue>
*/
define(['N/log', 'N/search', 'N/record'],
    /**
     * @param{log} log
     */
    (log, search, record) => {
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
                log.debug({ title: 'Contexto', details: scriptContext.type });
                if (scriptContext.type === scriptContext.UserEventType.EDIT) {

                    const newRecord = scriptContext.newRecord;
                    var vendor = {
                        value: newRecord.getValue({ fieldId: 'entity' }),
                        text: newRecord.getText({ fieldId: 'entity' })
                    }
                    var dataToVendor = search.lookupFields({
                        type: search.Type.VENDOR,
                        id: vendor.value,
                        columns: ['custentity_diot_aplica_diot', 'custentity_diot_tipo_operacion']
                    })
                    log.debug({ title: 'dataToVendor', details: dataToVendor });
                    var numLines = newRecord.getLineCount({ sublistId: 'item' });
                    log.debug({ title: 'No de resultados por linea:', details: numLines });
                    log.debug({ title: 'Vendor:', details: vendor });
                    for (let line = 0; line < numLines; line++) {
                        // newRecord.selectLine({ sublistId: 'item', line: line });
                        if (dataToVendor.custentity_diot_aplica_diot === true || dataToVendor.custentity_diot_aplica_diot === 'T') {
                            newRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_diot_aplica_diot', line: line, value: dataToVendor.custentity_diot_aplica_diot })
                            newRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_diot_tipo_operacion', line: line, value: dataToVendor.custentity_diot_tipo_operacion[0].value })
                        }
                        let item = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: line })
                        // log.debug({ title: 'Datos to list:', details: { vendor: vendorLine, item: item } });
                    }
                }
            } catch (e) {
                log.error({ title: 'Error beforeSubmit:', details: e });
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
        const afterSubmit = (scriptContext) => {
            try {
                log.debug({ title: 'Contexto', details: scriptContext.type });
                if (scriptContext.type === scriptContext.UserEventType.CREATE || scriptContext.type === scriptContext.UserEventType.EDIT) {

                    const idRecord = scriptContext.newRecord.id;
                    var recordCurr = record.load({ type: scriptContext.newRecord.type, id: idRecord, isDynamic: true })
                    var vendor = {
                        value: recordCurr.getValue({ fieldId: 'entity' }),
                        text: recordCurr.getText({ fieldId: 'entity' })
                    }
                    var dataToVendor = search.lookupFields({
                        type: search.Type.VENDOR,
                        id: vendor.value,
                        columns: ['custentity_diot_aplica_diot', 'custentity_diot_tipo_operacion']
                    })
                    log.debug({ title: 'dataToVendor', details: dataToVendor });
                    var numLines = recordCurr.getLineCount({ sublistId: 'item' });
                    log.debug({ title: 'No de resultados por linea:', details: numLines });
                    log.debug({ title: 'Vendor:', details: vendor });
                    for (let line = 0; line < numLines; line++) {
                        recordCurr.selectLine({ sublistId: 'item', line: line });
                        if (dataToVendor.custentity_diot_aplica_diot === true || dataToVendor.custentity_diot_aplica_diot === 'T') {
                            recordCurr.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_diot_aplica_diot', value: dataToVendor.custentity_diot_aplica_diot })
                            recordCurr.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_diot_tipo_operacion', value: dataToVendor.custentity_diot_tipo_operacion[0].value })
                        }
                        recordCurr.commitLine({ sublistId: 'item' });
                        // let item = recordCurr.getSublistValue({ sublistId: 'item', fieldId: 'item', line: line })
                        // log.debug({ title: 'Datos to list:', details: { vendor: vendorLine, item: item } });
                    }
                    recordCurr.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                }
            } catch (e) {
                log.error({ title: 'Error afterSubmit:', details: e });
            }

        }


        return { afterSubmit }

    });
