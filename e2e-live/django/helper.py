"""
Small operations the live test asks of the real backend (create a person, move a deadline, read the real emails...).
Each prints one line of JSON. Runs with the backend's own Python and the live settings.
"""
import argparse
import email
import glob
import json
import os
import re
from datetime import timedelta
from email import policy

import django

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.utils import timezone  # noqa: E402

User = get_user_model()


def emit(value):
    print(json.dumps(value, default=str))


def create_user(args):
    user = User.objects.create_user(
        username=args.email.split('@')[0] + str(User.objects.count()), email=args.email, password=args.password,
        first_name=args.first_name, role=args.role, branch='CSE', year=2,
    )
    if args.verified:
        user.email_verified_at = timezone.now()
        user.save(update_fields=['email_verified_at'])
    if args.staff:
        user.is_staff = True
        user.save(update_fields=['is_staff'])
    emit({'id': user.pk})


def set_deadline(args):
    User.objects.filter(email__iexact=args.email).update(email_verify_deadline=timezone.now() + timedelta(days=args.days))
    emit({'ok': True})


def get_user(args):
    user = User.objects.filter(email__iexact=args.email).first()
    if user is None:
        emit(None)
        return
    emit({
        'id': user.pk, 'email': user.email, 'verified': bool(user.email_verified_at), 'active': user.is_active,
        'days_left': round((user.email_verify_deadline - timezone.now()).total_seconds() / 86400, 2) if user.email_verify_deadline else None,
        'disputed': bool(user.email_disputed_at),
    })


def count_users(args):
    emit({'count': User.objects.filter(email__iexact=args.email).count()})


def make_form(args):
    from apps.forms.models import FieldType, Form, FormField, FormStatus
    form, _ = Form.objects.get_or_create(slug=args.slug, defaults={'title': 'Live Form', 'status': FormStatus.PUBLISHED, 'allow_multiple_responses': True, 'max_responses_per_user': 50})
    if not form.fields.exists():
        FormField.objects.create(form=form, label='Full name', type=FieldType.TEXT, is_required=True, order=1)
    emit({'id': form.pk})


def count_responses(args):
    from apps.forms.models import Response
    emit({'count': Response.objects.filter(form__slug=args.slug, user__email__iexact=args.email).count()})


def make_upload_form(args):
    from apps.forms.models import FieldType, Form, FormField, FormStatus
    form, _ = Form.objects.get_or_create(slug=args.slug, defaults={'title': 'Upload Form', 'status': FormStatus.PUBLISHED, 'allow_multiple_responses': True, 'max_responses_per_user': 50})
    if not form.fields.exists():
        FormField.objects.create(form=form, label='Full name', type=FieldType.TEXT, is_required=True, order=1)
        FormField.objects.create(form=form, label='Photo', type=FieldType.FILE, is_required=True, order=2)
        FormField.objects.create(form=form, label='Documents', type=FieldType.MULTI_FILE, order=3, validation_rules={'maxFiles': 2, 'maxFileSizeMB': 1})
    emit({'id': form.pk, 'fields': {f.label: f.pk for f in form.fields.all()}})


def uploads(args):
    from apps.forms.models import FormUpload
    rows = FormUpload.objects.filter(form__slug=args.slug).order_by('created_at')
    emit([{'id': str(u.pk), 'name': u.original_name, 'state': u.state, 'size': u.size, 'key': u.key, 'response': u.response_id} for u in rows])


def object_exists(args):
    import boto3
    from django.conf import settings
    s3 = boto3.client('s3', region_name=settings.FORM_UPLOAD_REGION, endpoint_url=settings.FORM_UPLOAD_ENDPOINT_URL)
    try:
        head = s3.head_object(Bucket=settings.FORM_UPLOAD_BUCKET, Key=args.key)
        emit({'exists': True, 'size': head['ContentLength']})
    except Exception:  # noqa: BLE001
        emit({'exists': False})


def stale_drafts(args):
    from apps.forms.models import Form, ResponseDraft
    form = Form.objects.get(slug=args.slug)
    made = 0
    for number in range(args.count):
        person = User.objects.create_user(username=f'stale{number}-{User.objects.count()}', email=f'stale{number}.{User.objects.count()}@example.org', password='x')
        draft = ResponseDraft.objects.create(form=form, user=person, answers={})
        ResponseDraft.objects.filter(pk=draft.pk).update(updated_at=timezone.now() - timedelta(days=45))
        made += 1
    emit({'made': made, 'remaining': ResponseDraft.objects.filter(updated_at__lt=timezone.now() - timedelta(days=30)).count()})


def mailbox(args):
    """Every email written so far, newest last: recipients, subject and the links found in the plain-text body."""
    messages = []
    for path in sorted(glob.glob(os.path.join(os.environ['LIVE_E2E_MAIL_DIR'], '*.log')), key=os.path.getmtime):
        with open(path, 'rb') as handle:
            raw = handle.read()
        # The file backend appends one or more messages separated by a dashed line.
        for chunk in re.split(rb'\r?\n-{79}\r?\n', raw):
            if not chunk.strip():
                continue
            message = email.message_from_bytes(chunk.strip(), policy=policy.default)
            body = message.get_body(preferencelist=('plain',))
            text = body.get_content() if body else ''
            messages.append({
                'to': [a.strip() for a in str(message['To']).split(',')], 'subject': str(message['Subject']),
                'verify': (re.search(r'https?://\S+/account/verify-email\?token=[\w-]+', text) or [None])[0],
                'dispute': (re.search(r'https?://\S+/account/verify-email/not-me\?token=[\w-]+', text) or [None])[0],
                'text': text,
            })
    emit(messages)


def clear_mailbox(args):
    for path in glob.glob(os.path.join(os.environ['LIVE_E2E_MAIL_DIR'], '*.log')):
        os.remove(path)
    emit({'ok': True})


def clear_cache(args):
    from django.core.cache import cache
    cache.clear()
    emit({'ok': True})


parser = argparse.ArgumentParser()
sub = parser.add_subparsers(dest='command', required=True)
p = sub.add_parser('create_user'); p.set_defaults(fn=create_user)
p.add_argument('email'); p.add_argument('--password', default='Live!Pass123'); p.add_argument('--first-name', default='Dee')
p.add_argument('--role', default='NON_AFFILIATE'); p.add_argument('--verified', action='store_true'); p.add_argument('--staff', action='store_true')
p = sub.add_parser('set_deadline'); p.set_defaults(fn=set_deadline); p.add_argument('email'); p.add_argument('--days', type=float, required=True)
p = sub.add_parser('get_user'); p.set_defaults(fn=get_user); p.add_argument('email')
p = sub.add_parser('count_users'); p.set_defaults(fn=count_users); p.add_argument('email')
p = sub.add_parser('make_form'); p.set_defaults(fn=make_form); p.add_argument('slug')
p = sub.add_parser('count_responses'); p.set_defaults(fn=count_responses); p.add_argument('slug'); p.add_argument('email')
p = sub.add_parser('make_upload_form'); p.set_defaults(fn=make_upload_form); p.add_argument('slug')
p = sub.add_parser('uploads'); p.set_defaults(fn=uploads); p.add_argument('slug')
p = sub.add_parser('object_exists'); p.set_defaults(fn=object_exists); p.add_argument('key')
p = sub.add_parser('stale_drafts'); p.set_defaults(fn=stale_drafts); p.add_argument('slug'); p.add_argument('--count', type=int, default=3)
for name, fn in (('mailbox', mailbox), ('clear_mailbox', clear_mailbox), ('clear_cache', clear_cache)):
    sub.add_parser(name).set_defaults(fn=fn)

arguments = parser.parse_args()
arguments.fn(arguments)
