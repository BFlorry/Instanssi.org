# -*- coding: utf-8 -*-

from Instanssi.common.auth import staff_access_required
from django.shortcuts import get_object_or_404
from Instanssi.kompomaatti.models import Compo, Entry
from Instanssi.kompomaatti.misc import entrysort
from Instanssi.admin_base.misc.custom_render import admin_render
from Instanssi.common.misc import get_url


@staff_access_required
def index(request, sel_event_id):
    # Render response
    return admin_render(request, "admin_slides/index.html", {
        'compos': Compo.objects.filter(event_id=sel_event_id),
        'selected_event_id': int(sel_event_id),
    })


@staff_access_required
def slide_results(request, sel_event_id, compo_id):
    # Get the compo
    c = get_object_or_404(Compo, pk=compo_id)

    # Get the entries
    s_entries = entrysort.sort_by_score(Entry.objects.filter(compo=c, disqualified=False))

    i = 0
    f_entries = []
    for entry in reversed(s_entries[:3]):
        f_entries.append({
            'id': entry.id,
            'creator': entry.creator,
            'name': entry.name,
            'score': entry.get_score(),
            'score_x': 0,
            'score_y': i * 2000,
            'score_z': i * 2000,
            'info_x': 0,
            'info_y': i * 2000 + 2000,
            'info_z': i * 2000 + 2000,
            'rank': entry.get_rank(),
        })
        i += 2

    r_entries = []
    for entry in s_entries[3:]:
        r_entries.append({
            'id': entry.id,
            'creator': entry.creator,
            'name': entry.name,
            'score': entry.get_score(),
            'rank': entry.get_rank(),
        })

    i += 1

    # Render
    return admin_render(request, 'admin_slides/slide_results.html', {
        'entries': f_entries,
        'r_entries': r_entries,
        'compo': c,
        'endinfo_x': 0,
        'endinfo_y': (i+1) * 2000,
        'endinfo_z': (i+1) * 2000,
        'last_x': 0,
        'last_y': (i+2) * 2000,
        'last_z': (i+2) * 2000,
        'selected_event_id': int(sel_event_id),
    })


@staff_access_required
def slide_entries(request, sel_event_id, compo_id):
    # Get the compo
    c = get_object_or_404(Compo, pk=compo_id)

    # Get the entries
    s_entries = entrysort.sort_by_score(Entry.objects.filter(compo=c, disqualified=False))

    i = 0
    flip = False
    f_entries = []
    for entry in s_entries:
        if flip:
            g = 180
        else:
            g = 0
        f_entries.append({
            'id': entry.id,
            'creator': entry.creator,
            'name': entry.name,
            'x': 0,
            'y': -i * 2500,
            'z': 0,
            'rot_y': 0,
            'rot_x': g,
            'rot_z': 0,
        })
        i += 1
        flip = not flip

    # Render
    return admin_render(request, 'admin_slides/slide_entries.html', {
        'entries': f_entries,
        'compo': c,
        'last_y': - i * 2500,
        'last_rot_x': flip,
        'selected_event_id': int(sel_event_id),
    })


@staff_access_required
def slide_entries_with_images(request, sel_event_id, compo_id):
    """Render entry slides with entry image after each title.
    Useful for late night art compos."""

    c = get_object_or_404(Compo, pk=compo_id)
    s_entries = entrysort.sort_by_score(Entry.objects.filter(compo=c, disqualified=False))

    i = 0
    rot_x = 0
    step = 1250

    f_entries = []
    for entry in s_entries:
        f_entries.append({
            'type': 'title',
            'id': entry.id,
            'creator': entry.creator,
            'name': entry.name,
            'x': 0,
            'y': -i * step,
            'z': 0,
            'rot_y': 0,
            'rot_x': rot_x,
            'rot_z': 0,
        })
        i += 1
        rot_x = (rot_x + 90) % 360

        file_url = None
        try:
            file_url = get_url(entry.imagefile_original.url)
        except:
            pass

        f_entries.append({
            'type': 'image',
            'id': 'img-%s' % str(entry.id),
            'file_url': file_url,
            # damn, the partynet is being slow. need to speed up development
            # 'file_url': get_url(entry.imagefile_thumbnail.url),
            'x': 0,
            'y:': -i * step,
            'z': 0,
            'rot_y': 0,
            'rot_x': rot_x,
            'rot_z': 0,
        })
        i += 1
        rot_x = (rot_x + 90) % 360

    # Render
    return admin_render(request, 'admin_slides/slide_entries_with_images.html', {
        'entries': f_entries,
        'compo': c,
        'last_y': -i * step,
        'last_rot_x': rot_x,
        'selected_event_id': int(sel_event_id),
    })

