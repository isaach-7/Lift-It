-- Disposable synthetic records; the transaction always rolls back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','flow-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','flow-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
declare eid uuid; template_id uuid := '20000000-0000-4000-8000-000000000001'; sid uuid := '30000000-0000-4000-8000-000000000001'; se uuid; st uuid; result public.sets; plan jsonb; p public.profiles;
begin
 p:=public.save_profile(' Alex ',4,180,80,'40000000-0000-4000-8000-000000000001');
 perform public.save_profile('Alex',4,180,80,'40000000-0000-4000-8000-000000000001');
 if p.preferred_name<>'Alex' or p.onboarding_completed_at is null or (select count(*) from public.weight_logs)<>1 then raise exception 'Profile retry failed'; end if;
 begin perform public.save_profile('Alex',8,180,null,null); raise exception 'Goal accepted'; exception when check_violation then null; end;
 begin perform public.save_profile('Alex',4,0,null,null); raise exception 'Height accepted'; exception when check_violation then null; end;
 select id into eid from public.exercises where name='Barbell Bench Press';
 if eid is null then select id into eid from public.exercises where equipment_type='barbell' limit 1; end if;
 plan:=jsonb_build_array(jsonb_build_object('exercise_id',eid,'rest_timer_seconds',90,'auto_increment_enabled',true,'rep_range_lower',6,'rep_range_upper',10,'increment_amount',2.5,'available_weights',jsonb_build_array(),'equipment_label','Test bench','sets',jsonb_build_array(jsonb_build_object('id','50000000-0000-4000-8000-000000000001','set_type','standard','target_reps',null,'target_weight',null))));
 perform public.save_workout_template(template_id,'Upper',plan);
 perform public.save_workout_template(template_id,'Upper',plan);
 if (select count(*) from public.workout_template_sets)<>1 then raise exception 'Template retry duplicated sets'; end if;
 if public.start_workout(sid,template_id)<>sid then raise exception 'Start failed'; end if;
 if public.start_workout('30000000-0000-4000-8000-000000000002',template_id)<>sid then raise exception 'Duplicate active session'; end if;
 perform public.save_workout_template(template_id,'Edited','[]');
 select id into se from public.session_exercises where session_id=sid;
 if (select count(*) from public.sets where session_exercise_id=se)<>1 then raise exception 'Snapshot changed'; end if;
 select id into st from public.sets where session_exercise_id=se;
 result:=public.log_workout_set(st,11,40);
 if result.next_weight<>42.5 then raise exception 'Increment failed'; end if;
 result:=public.log_workout_set(st,11,40);
 if result.next_weight<>42.5 or (select current_weight from public.exercise_progression)<>42.5 then raise exception 'Retry applied progression twice'; end if;
 begin perform public.log_workout_set(st,12,40); raise exception 'Changed retry accepted'; exception when raise_exception then if sqlerrm='Changed retry accepted' then raise; end if; end;
 result:=public.add_workout_set('50000000-0000-4000-8000-000000000002',se,'warmup');
 perform public.log_workout_set(result.id,15,20);
 if (select current_weight from public.exercise_progression)<>42.5 then raise exception 'Warmup changed progression'; end if;
 result:=public.add_workout_set('50000000-0000-4000-8000-000000000003',se,'failure');
 result:=public.log_workout_set(result.id,5,42.5);
 if result.next_weight<>40 then raise exception 'Failure decrement failed'; end if;
 result:=public.add_workout_set('50000000-0000-4000-8000-000000000004',se,'standard');
 result:=public.log_workout_set(result.id,11,30,'once');
 if (select current_weight from public.exercise_progression)<>40 then raise exception 'One-set override persisted'; end if;
 result:=public.add_workout_set(gen_random_uuid(),se,'standard');
 result:=public.log_workout_set(result.id,6,40);
 if result.next_weight<>40 then raise exception 'Lower boundary changed weight'; end if;
 result:=public.add_workout_set(gen_random_uuid(),se,'standard');
 result:=public.log_workout_set(result.id,10,40);
 if result.next_weight<>40 then raise exception 'Upper boundary changed weight'; end if;
 perform public.finish_workout(sid);
 perform public.finish_workout(sid);
 if (select count(*) from public.weekly_attendance(now()-interval '1 day',now()+interval '1 day','Europe/London'))<>1 then raise exception 'Attendance failed'; end if;
 if (select count(*) from public.exercise_progress(now()-interval '1 day'))<>1 then raise exception 'Progress missing'; end if;
 select id into eid from public.exercises where equipment_type='bodyweight' and supports_added_weight limit 1;
 plan:=jsonb_set(plan,'{0,exercise_id}',to_jsonb(eid));
 plan:=jsonb_set(plan,'{0,uses_added_weight}','false');
 perform public.save_workout_template(template_id,'Bodyweight',plan);
 sid:=public.start_workout(gen_random_uuid(),template_id);
 select id into se from public.session_exercises where session_id=sid;
 select id into st from public.sets where session_exercise_id=se;
 result:=public.log_workout_set(st,12,null);
 if result.weight is not null or result.next_weight is not null then raise exception 'Unweighted exercise required weight'; end if;
 perform public.finish_workout(sid);
 plan:=jsonb_set(plan,'{0,uses_added_weight}','true');
 perform public.save_workout_template(template_id,'Weighted',plan);
 sid:=public.start_workout(gen_random_uuid(),template_id);
 select id into se from public.session_exercises where session_id=sid;
 select id into st from public.sets where session_exercise_id=se;
 result:=public.log_workout_set(st,8,5);
 perform public.finish_workout(sid);
 if (select count(distinct equipment_key) from public.exercise_progress(now()-interval '1 day') where exercise_id=eid)<>2 then raise exception 'Bodyweight modes combined'; end if;
 if not exists(select 1 from public.exercise_progress(now()-interval '1 day') where exercise_id=eid and metric='reps' and value=12) then raise exception 'Rep record missing'; end if;
 if (select count(*) from public.weekly_attendance(now()-interval '1 day',now()+interval '1 day','Europe/London'))<>1 then raise exception 'Same-day sessions counted twice'; end if;
 begin insert into public.workout_sessions(id,user_id,name) values(gen_random_uuid(),auth.uid(),'Bypass'); raise exception 'Direct session write allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$
begin
 if exists(select 1 from public.weight_logs) or exists(select 1 from public.workout_sessions) or exists(select 1 from public.sets) or exists(select 1 from public.exercise_progression) then raise exception 'Cross-user read leak'; end if;
 begin perform public.start_workout(gen_random_uuid(),'20000000-0000-4000-8000-000000000001'); raise exception 'Cross-user start accepted'; exception when raise_exception then if sqlerrm='Cross-user start accepted' then raise; end if; end;
 begin perform public.save_workout_template('20000000-0000-4000-8000-000000000001','Stolen','[]'); raise exception 'Cross-user template accepted'; exception when raise_exception then if sqlerrm='Cross-user template accepted' then raise; end if; end;
 begin perform public.finish_workout('30000000-0000-4000-8000-000000000001'); raise exception 'Cross-user finish accepted'; exception when raise_exception then if sqlerrm='Cross-user finish accepted' then raise; end if; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.start_workout(gen_random_uuid(),gen_random_uuid()); raise exception 'Anonymous RPC allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
