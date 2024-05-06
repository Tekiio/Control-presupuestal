/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/task', 'N/ui/serverWidget','N/ui/message'],
    /**
 * @param{record} record
 * @param{task} task
 * @param{serverWidget} serverWidget
 */
    (record, task, serverWidget,message) => {
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
                let contexto = scriptContext.type;
                let currentForm = scriptContext.form;
                let recordNew = scriptContext.newRecord;
                let idFile = recordNew.getValue({ fieldId: 'custrecord_fb_upload_file_csv' })
                let actualizo = recordNew.getValue({ fieldId: 'custrecord_fb_success_complete' })
                let inProcess = recordNew.getValue({ fieldId: 'custrecord_fb_in_process_update' })
                log.audit({ title: 'idFile', details: idFile });
                log.audit({ title: 'contexto', details: contexto });
                switch (contexto) {
                    case scriptContext.UserEventType.VIEW:
                        if (idFile && !actualizo && !inProcess) {
                            currentForm.clientScriptModulePath = '../uievents/fb_update_group_approver_cs.js';
                            currentForm.addButton({ id: 'custpage_execute_task', label: 'Actualizar', functionName: 'ejecutaMapReduce(' + recordNew.id + ')' });
                        }
                        if(inProcess){
                            currentForm.addPageInitMessage({type: message.Type.INFORMATION, message: 'En proceso de actualizacion...', duration: 10000})
                        }
                        if(!inProcess && actualizo){
                            currentForm.addPageInitMessage({type: message.Type.CONFIRMATION, message: 'Actualizacion finalizada', duration: 10000})
                        }
                        break;
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

        }

        return { beforeLoad, beforeSubmit, afterSubmit }

    });
