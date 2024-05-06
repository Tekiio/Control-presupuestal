/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/https', 'N/log', 'N/ui/message', 'N/ui/serverWidget', 'N/url', 'N/task'],
    /**
     * @param{https} https
     * @param{log} log
     * @param{message} message
     * @param{serverWidget} serverWidget
     * @param{url} url
     */
    (https, log, message, serverWidget, url, task) => {

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
                var newRecord = scriptContext.newRecord;
                var form = scriptContext.form;
                let taskId = newRecord.getValue({ fieldId: 'custbody_id_task_working' })
                if (taskId) {
                    var estadoProceso = form.addField({ id: 'custpage_text', type: serverWidget.FieldType.TEXT, label: 'Estatus de Proceso' });
                    let status = task.checkStatus({ taskId: taskId });
                    log.audit({ title: 'status', details: status });
                    let statusDef = status.status;
                    switch (statusDef) {
                        case 'PENDING':
                            var messageObj = message.create({ type: message.Type.INFORMATION, message: 'Pendiente en el ajuste de presupuestos, espere un momento y recargue la pagina...', duration: 20000 });
                            form.addPageInitMessage({ message: messageObj });
                            estadoProceso.defaultValue = statusDef
                            break;
                        case 'PROCESSING':
                            var messageObj = message.create({ type: message.Type.INFORMATION, message: 'Ajustando presupuestos, espere un momento y recargue la pagina...', duration: 20000 });
                            form.addPageInitMessage({ message: messageObj });
                            formestadoProcesodefaultValue = statusDef
                            break;
                        case 'COMPLETE':
                            var messageObj = message.create({ type: message.Type.CONFIRMATION, message: 'Traslado aprobado', duration: 20000 });
                            form.addPageInitMessage({ message: messageObj });
                            estadoProceso.defaultValue = statusDef
                            break;
                        case 'FAILED':
                            var messageObj = message.create({ type: message.Type.WARNING, message: 'Unexpected error, contact your administrator', duration: 20000 });
                            form.addPageInitMessage({ message: messageObj });
                            estadoProceso.defaultValue = statusDef
                            break;
                    }
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

                let newRecord = scriptContext.newRecord;
                let oldRecord = scriptContext.oldRecord;
                log.audit({ title: 'newRecord', details: newRecord });
                log.audit({ title: 'oldRecord', details: oldRecord });
                let statusOld = oldRecord.getValue({ fieldId: 'transtatus' }) || 'NA';
                let statusNew = newRecord.getValue({ fieldId: 'transtatus' }) || 'NA';
                log.audit({ title: 'Status', details: { statusNew, statusOld } });
                if (statusOld === 'A' && statusNew === 'B') {

                    let idRecord = parseInt(newRecord.id);
                    let typeTran = newRecord.type;
                    let isMultiSub = newRecord.getValue({ fieldId: 'custbody_fb_check_multi_sub' });
                    var url_service_sl = url.resolveScript({
                        scriptId: DATA_SL_SERVICE.SCRIPID,
                        deploymentId: DATA_SL_SERVICE.DEPLOYID,
                        returnExternalUrl: true,
                        params: {
                            operador: 'request_on_transfer',
                            idRecord: idRecord,
                            typeTran: typeTran,
                            isMultiSub: isMultiSub
                        }
                    });
                    log.audit({
                        title: 'Parametros a enviar', details: {
                            operador: 'request_on_transfer',
                            valores: {
                                idRecord: idRecord,
                                typeTran: typeTran
                            }
                        }
                    });

                    var response = https.get({ url: url_service_sl })
                    let bodyReq = JSON.parse(response.body)
                    log.audit({ title: 'response', details: bodyReq.taskId });

                    newRecord.setValue({ fieldId: 'custbody_id_task_working', value: bodyReq.taskId, ignoreFieldChange: true })
                    // record.submitFields({
                    //     type: 'customtransaction_imr_traspaso_de_presup',
                    //     id: params.idRecord,
                    //     values: {
                    //         custbody_id_task_working: idTaskUb
                    //     }
                    // })
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

            } catch (e) {
                log.error({ title: 'Error afterSubmit:', details: e });
            }

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
